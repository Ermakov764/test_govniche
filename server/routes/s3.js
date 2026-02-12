const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { s3, BUCKET_NAME } = require('../config/s3');

const router = express.Router();

// Configure multer for S3 uploads
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET_NAME,
    acl: 'public-read',
    key: function (req, file, cb) {
      // Generate unique filename with timestamp
      const filename = `${Date.now()}-${file.originalname}`;
      cb(null, filename);
    },
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedAt: new Date().toISOString()
      });
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true);
  }
});

/**
 * @route   POST /api/s3/upload
 * @desc    Upload file to S3
 * @access  Public
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your_access_key_here') {
      return res.status(400).json({ 
        error: 'AWS credentials не настроены. Пожалуйста, настройте файл .env с вашими AWS credentials.',
        code: 'AWS_CREDENTIALS_NOT_CONFIGURED'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        key: req.file.key,
        location: req.file.location,
        bucket: req.file.bucket,
        originalName: req.file.originalname,
        size: req.file.size,
        contentType: req.file.contentType,
        uploadedAt: req.file.metadata.uploadedAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle specific AWS errors
    if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      return res.status(400).json({ 
        error: 'Неверные AWS credentials. Проверьте AWS_ACCESS_KEY_ID и AWS_SECRET_ACCESS_KEY в файле .env',
        code: error.code,
        message: error.message
      });
    }
    
    if (error.code === 'NoSuchBucket') {
      return res.status(400).json({ 
        error: `S3 bucket "${BUCKET_NAME}" не существует. Проверьте AWS_S3_BUCKET_NAME в файле .env`,
        code: error.code
      });
    }

    res.status(500).json({ error: 'Failed to upload file', message: error.message, code: error.code });
  }
});

/**
 * @route   POST /api/s3/upload-multiple
 * @desc    Upload multiple files to S3
 * @access  Public
 */
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your_access_key_here') {
      return res.status(400).json({ 
        error: 'AWS credentials не настроены. Пожалуйста, настройте файл .env с вашими AWS credentials.',
        code: 'AWS_CREDENTIALS_NOT_CONFIGURED'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files.map(file => ({
      key: file.key,
      location: file.location,
      bucket: file.bucket,
      originalName: file.originalname,
      size: file.size,
      contentType: file.contentType,
      uploadedAt: file.metadata.uploadedAt
    }));

    res.json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      files
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle specific AWS errors
    if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      return res.status(400).json({ 
        error: 'Неверные AWS credentials. Проверьте AWS_ACCESS_KEY_ID и AWS_SECRET_ACCESS_KEY в файле .env',
        code: error.code,
        message: error.message
      });
    }
    
    if (error.code === 'NoSuchBucket') {
      return res.status(400).json({ 
        error: `S3 bucket "${BUCKET_NAME}" не существует. Проверьте AWS_S3_BUCKET_NAME в файле .env`,
        code: error.code
      });
    }

    res.status(500).json({ error: 'Failed to upload files', message: error.message, code: error.code });
  }
});

/**
 * @route   GET /api/s3/files
 * @desc    Get list of all files in S3 bucket
 * @access  Public
 */
router.get('/files', async (req, res) => {
  try {
    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === 'your_access_key_here') {
      return res.status(400).json({ 
        error: 'AWS credentials не настроены. Пожалуйста, настройте файл .env с вашими AWS credentials.',
        code: 'AWS_CREDENTIALS_NOT_CONFIGURED'
      });
    }

    const params = {
      Bucket: BUCKET_NAME
    };

    const data = await s3.listObjectsV2(params).promise();
    
    const files = (data.Contents || []).map(file => ({
      key: file.Key,
      size: file.Size,
      lastModified: file.LastModified,
      etag: file.ETag
    }));

    res.json({
      success: true,
      count: files.length,
      files
    });
  } catch (error) {
    console.error('List files error:', error);
    
    // Handle specific AWS errors
    if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      return res.status(400).json({ 
        error: 'Неверные AWS credentials. Проверьте AWS_ACCESS_KEY_ID и AWS_SECRET_ACCESS_KEY в файле .env',
        code: error.code,
        message: error.message
      });
    }
    
    if (error.code === 'NoSuchBucket') {
      return res.status(400).json({ 
        error: `S3 bucket "${BUCKET_NAME}" не существует. Проверьте AWS_S3_BUCKET_NAME в файле .env`,
        code: error.code
      });
    }

    res.status(500).json({ error: 'Failed to list files', message: error.message, code: error.code });
  }
});

/**
 * @route   GET /api/s3/files/:key
 * @desc    Get file details
 * @access  Public
 */
router.get('/files/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    const params = {
      Bucket: BUCKET_NAME,
      Key: decodedKey
    };

    const data = await s3.headObject(params).promise();
    
    res.json({
      success: true,
      file: {
        key: decodedKey,
        size: data.ContentLength,
        contentType: data.ContentType,
        lastModified: data.LastModified,
        etag: data.ETag,
        metadata: data.Metadata
      }
    });
  } catch (error) {
    if (error.code === 'NotFound') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file', message: error.message });
  }
});

/**
 * @route   GET /api/s3/download/:key
 * @desc    Download file from S3
 * @access  Public
 */
router.get('/download/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    const params = {
      Bucket: BUCKET_NAME,
      Key: decodedKey
    };

    const data = await s3.getObject(params).promise();
    
    // Set appropriate headers
    res.setHeader('Content-Type', data.ContentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${decodedKey.split('/').pop()}"`);
    res.setHeader('Content-Length', data.ContentLength);

    res.send(data.Body);
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file', message: error.message });
  }
});

/**
 * @route   GET /api/s3/preview/:key
 * @desc    Get file preview URL (signed URL)
 * @access  Public
 */
router.get('/preview/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    const params = {
      Bucket: BUCKET_NAME,
      Key: decodedKey,
      Expires: 3600 // URL expires in 1 hour
    };

    const url = s3.getSignedUrl('getObject', params);
    
    res.json({
      success: true,
      url,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview URL', message: error.message });
  }
});

/**
 * @route   DELETE /api/s3/files/:key
 * @desc    Delete file from S3
 * @access  Public
 */
router.delete('/files/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    const params = {
      Bucket: BUCKET_NAME,
      Key: decodedKey
    };

    await s3.deleteObject(params).promise();
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      key: decodedKey
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file', message: error.message });
  }
});

/**
 * @route   DELETE /api/s3/files
 * @desc    Delete multiple files from S3
 * @access  Public
 */
router.delete('/files', async (req, res) => {
  try {
    const { keys } = req.body;
    
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'No keys provided' });
    }

    const objects = keys.map(key => ({ Key: decodeURIComponent(key) }));
    
    const params = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: objects,
        Quiet: false
      }
    };

    const data = await s3.deleteObjects(params).promise();
    
    res.json({
      success: true,
      message: `${data.Deleted.length} file(s) deleted successfully`,
      deleted: data.Deleted,
      errors: data.Errors || []
    });
  } catch (error) {
    console.error('Delete multiple error:', error);
    res.status(500).json({ error: 'Failed to delete files', message: error.message });
  }
});

module.exports = router;
