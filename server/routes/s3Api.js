/**
 * S3 API по ТЗ и спецификации:
 * GET  /api/s3/files         — список (user_id, task_id, limit, offset)
 * POST /api/s3/files         — загрузка (file, owner_id, task_id?) → 201
 * GET  /api/s3/files/:file_id — скачивание (бинарный + Content-Type)
 * DELETE /api/s3/files/:file_id — удаление (soft) → 204 No Content
 *
 * API Gateway передаёт X-User-Id; owner_id можно брать из тела или заголовка.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/s3');
const s3Storage = require('../config/s3Storage');

const router = express.Router();

// Временная загрузка в s3_temp
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      await s3Storage.ensureDirs();
      cb(null, s3Storage.TEMP_DIR);
    },
    filename: (req, file, cb) => {
      cb(null, `upload-${Date.now()}-${path.basename(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true)
});

// owner_id из тела или из заголовка X-User-Id (от API Gateway)
function resolveOwnerId(req) {
  const fromBody = req.body && req.body.owner_id;
  const fromHeader = req.get('X-User-Id');
  return fromBody || fromHeader || null;
}

/**
 * GET /api/s3/files
 * Параметры: user_id?, task_id?, limit? (default 100), offset? (default 0)
 */
router.get('/files', (req, res) => {
  try {
    const user_id = req.query.user_id || req.get('X-User-Id') || undefined;
    const task_id = req.query.task_id || undefined;
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 100;
    const offset = req.query.offset !== undefined ? parseInt(req.query.offset, 10) : 0;

    const list = db.listFiles({ user_id, task_id, limit, offset });
    res.status(200).json(list);
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/s3/files
 * multipart: file (обязательно), owner_id (обязательно или X-User-Id), task_id (опционально)
 * Ответ 201: { file_id, filename, created_at, size, owner_id, task_id }
 */
router.post('/files', upload.single('file'), async (req, res) => {
  let tempPath = req.file ? req.file.path : null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Incorrect request', code: 'NO_FILE' });
    }

    const owner_id = resolveOwnerId(req);
    if (!owner_id) {
      return res.status(400).json({ error: 'Incorrect request', code: 'MISSING_OWNER_ID' });
    }

    const task_id = (req.body && req.body.task_id) || null;
    const { fileId, relativePath } = s3Storage.generatePath();

    await s3Storage.moveToPermanent(req.file.path, relativePath);
    tempPath = null;

    const filename = (req.file.originalname || 'file').replace(/[/\\]/g, '_').slice(0, 255);
    const mime_type = (req.file.mimetype || 'application/octet-stream').slice(0, 100);

    db.insertFile({
      file_id: fileId,
      filename,
      path: relativePath,
      size: req.file.size,
      mime_type,
      owner_id,
      task_id
    });

    const row = db.getFileById(fileId);
    res.status(201).json({
      file_id: row.file_id,
      filename: row.filename,
      created_at: row.created_at,
      size: row.size,
      owner_id: row.owner_id,
      task_id: row.task_id
    });
  } catch (err) {
    if (tempPath) {
      try { await require('fs').promises.unlink(tempPath); } catch (_) {}
    }
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/s3/files/:file_id
 * Скачивание файла: бинарное тело + Content-Type.
 */
router.get('/files/:file_id', (req, res) => {
  try {
    const { file_id } = req.params;
    const row = db.getFileById(file_id);
    if (!row) {
      return res.status(404).json({ error: 'Resource not found', code: 'NOT_FOUND' });
    }
    if (row.is_deleted) {
      return res.status(404).json({ error: 'Resource not found', code: 'NOT_FOUND' });
    }

    const absolutePath = s3Storage.getAbsolutePath(row.path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Resource not found', code: 'FILE_MISSING' });
    }

    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.filename)}"`);
    const stream = fs.createReadStream(absolutePath);
    stream.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/s3/files/:file_id
 * Мягкое удаление → 204 No Content.
 */
router.delete('/files/:file_id', (req, res) => {
  try {
    const { file_id } = req.params;
    const row = db.getFileById(file_id);
    if (!row) {
      return res.status(404).json({ error: 'Resource not found', code: 'NOT_FOUND' });
    }
    const deleted = db.softDelete(file_id);
    if (!deleted) {
      return res.status(404).json({ error: 'Resource not found', code: 'NOT_FOUND' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
