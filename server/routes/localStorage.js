const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const {
  initStorage,
  getFilePath,
  saveMetadata,
  getMetadata,
  deleteFile: deleteFileFromStorage,
  listFiles,
  getFileInfo
} = require('../config/localStorage');

const router = express.Router();

// Инициализация хранилища при загрузке модуля
initStorage();

// Настройка multer для локального хранилища
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { FILES_DIR } = require('../config/localStorage');
    await fs.mkdir(FILES_DIR, { recursive: true });
    cb(null, FILES_DIR);
  },
  filename: (req, file, cb) => {
    // Убираем path traversal и слеши из имени
    const safeName = (file.originalname || 'file').replace(/\.\./g, '').replace(/[/\\]/g, '_');
    const filename = `${Date.now()}-${safeName}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

/**
 * @route   POST /api/storage/upload
 * @desc    Upload file to local storage
 * @access  Public
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const key = req.file.filename;
    const metadata = {
      fieldName: req.file.fieldname,
      originalName: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    await saveMetadata(key, metadata);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        key: key,
        location: `/api/storage/files/${key}`,
        bucket: 'local-storage',
        originalName: req.file.originalname,
        size: req.file.size,
        contentType: req.file.mimetype,
        uploadedAt: metadata.uploadedAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file', message: error.message });
  }
});

/**
 * @route   POST /api/storage/upload-multiple
 * @desc    Upload multiple files to local storage
 * @access  Public
 */
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = [];

    for (const file of req.files) {
      const key = file.filename;
      const metadata = {
        fieldName: file.fieldname,
        originalName: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

      await saveMetadata(key, metadata);

      files.push({
        key: key,
        location: `/api/storage/files/${key}`,
        bucket: 'local-storage',
        originalName: file.originalname,
        size: file.size,
        contentType: file.mimetype,
        uploadedAt: metadata.uploadedAt
      });
    }

    res.json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      files
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files', message: error.message });
  }
});

/**
 * @route   GET /api/storage/files
 * @desc    Get list of all files in local storage
 * @access  Public
 */
router.get('/files', async (req, res) => {
  try {
    const files = await listFiles();
    
    res.json({
      success: true,
      count: files.length,
      files
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files', message: error.message });
  }
});

/**
 * @route   GET /api/storage/files/:key/view
 * @desc    View file (for preview) — must be before /files/:key so "view" is not captured as key
 * @access  Public
 */
router.get('/files/:key/view', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    const filePath = getFilePath(decodedKey);
    const fileInfo = await getFileInfo(decodedKey);

    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', fileInfo.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', fileInfo.size);

    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    if (error.message === 'Invalid key') {
      return res.status(400).json({ error: 'Invalid key' });
    }
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('View file error:', error);
    res.status(500).json({ error: 'Failed to view file', message: error.message });
  }
});

/**
 * @route   GET /api/storage/files/:key
 * @desc    Get file details
 * @access  Public
 */
router.get('/files/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    const fileInfo = await getFileInfo(decodedKey);
    
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      success: true,
      file: fileInfo
    });
  } catch (error) {
    if (error.message === 'Invalid key') {
      return res.status(400).json({ error: 'Invalid key' });
    }
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file', message: error.message });
  }
});

/**
 * @route   GET /api/storage/download/:key
 * @desc    Download file from local storage
 * @access  Public
 */
router.get('/download/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    const filePath = getFilePath(decodedKey);
    const fileInfo = await getFileInfo(decodedKey);

    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Устанавливаем заголовки
    res.setHeader('Content-Type', fileInfo.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.metadata?.originalName || decodedKey}"`);
    res.setHeader('Content-Length', fileInfo.size);

    // Отправляем файл
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    if (error.message === 'Invalid key') {
      return res.status(400).json({ error: 'Invalid key' });
    }
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file', message: error.message });
  }
});

/**
 * @route   GET /api/storage/preview/:key
 * @desc    Get file preview URL
 * @access  Public
 */
router.get('/preview/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    const fileInfo = await getFileInfo(decodedKey);
    
    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    const url = `${req.protocol}://${req.get('host')}/api/storage/files/${encodeURIComponent(decodedKey)}/view`;
    
    res.json({
      success: true,
      url,
      expiresIn: null // Локальные файлы не имеют срока действия
    });
  } catch (error) {
    if (error.message === 'Invalid key') {
      return res.status(400).json({ error: 'Invalid key' });
    }
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview URL', message: error.message });
  }
});

/**
 * @route   DELETE /api/storage/files/:key
 * @desc    Delete file from local storage
 * @access  Public
 */
router.delete('/files/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    await deleteFileFromStorage(decodedKey);
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      key: decodedKey
    });
  } catch (error) {
    if (error.message === 'Invalid key') {
      return res.status(400).json({ error: 'Invalid key' });
    }
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file', message: error.message });
  }
});

/**
 * @route   DELETE /api/storage/files
 * @desc    Delete multiple files from local storage
 * @access  Public
 */
router.delete('/files', async (req, res) => {
  try {
    const { keys } = req.body;
    
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'No keys provided' });
    }

    const deleted = [];
    const errors = [];

    for (const key of keys) {
      try {
        const decoded = decodeURIComponent(key);
        await deleteFileFromStorage(decoded);
        deleted.push({ key: decoded });
      } catch (error) {
        errors.push({ key, error: error.message === 'Invalid key' ? 'Invalid key' : error.message });
      }
    }
    
    res.json({
      success: true,
      message: `${deleted.length} file(s) deleted successfully`,
      deleted,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Delete multiple error:', error);
    res.status(500).json({ error: 'Failed to delete files', message: error.message });
  }
});

module.exports = router;
