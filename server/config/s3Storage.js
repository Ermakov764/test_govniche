/**
 * Локальное файловое хранилище S3-сервиса.
 * Загрузка во временную папку → запись в БД → перенос в постоянное хранилище.
 */

const path = require('path');
const fs = require('fs').promises;
const { randomUUID } = require('crypto');

const STORAGE_ROOT = process.env.S3_STORAGE_DIR || path.join(__dirname, '../../storage');
const FILES_DIR = path.join(STORAGE_ROOT, 's3_files');
const TEMP_DIR = path.join(STORAGE_ROOT, 's3_temp');

async function ensureDirs() {
  await fs.mkdir(FILES_DIR, { recursive: true });
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

/**
 * Генерирует уникальный file_id (UUID) и внутренний path для хранения.
 * Path уникален и привязан к file_id.
 */
function generatePath() {
  const fileId = randomUUID();
  const pathSegment = path.join(fileId.slice(0, 2), fileId);
  const storagePath = path.join(FILES_DIR, pathSegment);
  return { fileId, relativePath: pathSegment, absolutePath: storagePath };
}

/**
 * Сохранить файл из временного пути в постоянное хранилище.
 * @param {string} tempPath - полный путь к файлу во временной папке
 * @param {string} relativePath - относительный path (как в БД)
 * @returns {string} absolute path к сохранённому файлу
 */
async function moveToPermanent(tempPath, relativePath) {
  await ensureDirs();
  const targetPath = path.join(FILES_DIR, relativePath);
  const targetDir = path.dirname(targetPath);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.rename(tempPath, targetPath);
  return targetPath;
}

/**
 * Получить абсолютный путь к файлу по относительному path из БД.
 */
function getAbsolutePath(relativePath) {
  if (!relativePath || relativePath.includes('..')) {
    throw new Error('Invalid path');
  }
  return path.join(FILES_DIR, relativePath);
}

/**
 * Удалить файл с диска (опционально, при soft delete можно не удалять сразу).
 */
async function removeFileFromDisk(relativePath) {
  const absolutePath = getAbsolutePath(relativePath);
  try {
    await fs.unlink(absolutePath);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

module.exports = {
  ensureDirs,
  TEMP_DIR,
  FILES_DIR,
  generatePath,
  moveToPermanent,
  getAbsolutePath,
  removeFileFromDisk
};
