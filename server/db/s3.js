/**
 * S3-сервис: хранилище метаданных файлов (SQLite).
 * Схема по ТЗ: file_id, filename, path, size, mime_type, created_at, owner_id, task_id, is_deleted.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = process.env.S3_DB_DIR || path.join(__dirname, '../../storage');
const DB_PATH = path.join(DB_DIR, 's3_metadata.db');

let db = null;

function getDb() {
  if (db) return db;
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
    return db;
  } catch (err) {
    console.error('S3 DB init error:', err);
    throw err;
  }
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS files (
      file_id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      owner_id TEXT NOT NULL,
      task_id TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files(owner_id);
    CREATE INDEX IF NOT EXISTS idx_files_task_id ON files(task_id);
    CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted);
  `);
}

/**
 * Вставить запись о файле.
 * @param {{ file_id: string, filename: string, path: string, size: number, mime_type: string, owner_id: string, task_id?: string }} row
 */
function insertFile(row) {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO files (file_id, filename, path, size, mime_type, owner_id, task_id)
    VALUES (@file_id, @filename, @path, @size, @mime_type, @owner_id, @task_id)
  `);
  stmt.run({
    file_id: row.file_id,
    filename: row.filename,
    path: row.path,
    size: row.size,
    mime_type: row.mime_type || 'application/octet-stream',
    owner_id: row.owner_id,
    task_id: row.task_id || null
  });
}

/**
 * Список файлов с фильтрами и пагинацией (только не удалённые).
 * @param {{ user_id?: string, task_id?: string, limit?: number, offset?: number }} opts
 * @returns {{ file_id, filename, created_at, size, owner_id, task_id }[]}
 */
function listFiles(opts = {}) {
  const d = getDb();
  const limit = Math.min(Math.max(Number(opts.limit) || 100, 1), 1000);
  const offset = Math.max(Number(opts.offset) || 0, 0);
  let sql = `SELECT file_id, filename, created_at, size, owner_id, task_id FROM files WHERE is_deleted = 0`;
  const params = [];

  if (opts.user_id) {
    sql += ` AND owner_id = ?`;
    params.push(opts.user_id);
  }
  if (opts.task_id) {
    sql += ` AND task_id = ?`;
    params.push(opts.task_id);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const stmt = d.prepare(sql);
  const rows = stmt.all(...params);
  return rows.map((r) => ({
    file_id: r.file_id,
    filename: r.filename,
    created_at: r.created_at,
    size: r.size,
    owner_id: r.owner_id,
    task_id: r.task_id
  }));
}

/**
 * Получить запись по file_id (включая удалённые — для проверки прав).
 */
function getFileById(fileId) {
  const d = getDb();
  const stmt = d.prepare(
    `SELECT file_id, filename, path, size, mime_type, created_at, owner_id, task_id, is_deleted FROM files WHERE file_id = ?`
  );
  return stmt.get(fileId) || null;
}

/**
 * Мягкое удаление: установить is_deleted = 1.
 */
function softDelete(fileId) {
  const d = getDb();
  const stmt = d.prepare(`UPDATE files SET is_deleted = 1 WHERE file_id = ?`);
  const result = stmt.run(fileId);
  return result.changes > 0;
}

module.exports = {
  getDb,
  DB_PATH,
  insertFile,
  listFiles,
  getFileById,
  softDelete
};
