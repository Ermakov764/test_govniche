const fs = require('fs').promises;
const path = require('path');

// Путь к локальному хранилищу (для тестов можно задать STORAGE_DIR)
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
const FILES_DIR = path.join(STORAGE_DIR, 'files');
const METADATA_DIR = path.join(STORAGE_DIR, 'metadata');

// Инициализация хранилища
const initStorage = async () => {
  try {
    await fs.mkdir(FILES_DIR, { recursive: true });
    await fs.mkdir(METADATA_DIR, { recursive: true });
    console.log(`✅ Локальное хранилище инициализировано: ${STORAGE_DIR}`);
  } catch (error) {
    console.error(`❌ Ошибка инициализации хранилища: ${error.message}`);
    throw error;
  }
};

// Проверка ключа: запрет path traversal и выход за пределы хранилища
const isKeySafe = (key) => {
  if (!key || typeof key !== 'string') return false;
  if (key.includes('..') || path.isAbsolute(key)) return false;
  const resolved = path.resolve(FILES_DIR, key);
  return resolved.startsWith(path.resolve(FILES_DIR));
};

// Получить путь к файлу (только если ключ безопасен)
const getFilePath = (key) => {
  if (!isKeySafe(key)) throw new Error('Invalid key');
  return path.join(FILES_DIR, key);
};

// Получить путь к метаданным
const getMetadataPath = (key) => {
  if (!isKeySafe(key)) throw new Error('Invalid key');
  return path.join(METADATA_DIR, `${key}.json`);
};

// Сохранить метаданные
const saveMetadata = async (key, metadata) => {
  const metadataPath = getMetadataPath(key);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
};

// Получить метаданные
const getMetadata = async (key) => {
  try {
    const metadataPath = getMetadataPath(key);
    const data = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
};

// Удалить файл и метаданные
const deleteFile = async (key) => {
  const filePath = getFilePath(key);
  const metadataPath = getMetadataPath(key);
  
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Файл может не существовать
  }
  
  try {
    await fs.unlink(metadataPath);
  } catch (error) {
    // Метаданные могут не существовать
  }
};

// Получить список всех файлов
const listFiles = async () => {
  try {
    const files = await fs.readdir(FILES_DIR);
    const fileList = [];

    for (const file of files) {
      const filePath = getFilePath(file);
      const stats = await fs.stat(filePath);
      
      // Пропускаем директории
      if (stats.isDirectory()) continue;

      const metadata = await getMetadata(file) || {};
      
      fileList.push({
        key: file,
        size: stats.size,
        lastModified: stats.mtime,
        etag: `"${stats.mtime.getTime()}"`,
        contentType: metadata.contentType || 'application/octet-stream',
        originalName: metadata.originalName || file
      });
    }

    return fileList.sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error('Ошибка получения списка файлов:', error);
    return [];
  }
};

// Получить информацию о файле
const getFileInfo = async (key) => {
  try {
    const filePath = getFilePath(key);
    const stats = await fs.stat(filePath);
    const metadata = await getMetadata(key) || {};

    return {
      key,
      size: stats.size,
      lastModified: stats.mtime,
      etag: `"${stats.mtime.getTime()}"`,
      contentType: metadata.contentType || 'application/octet-stream',
      metadata: metadata
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

module.exports = {
  initStorage,
  getFilePath,
  getMetadataPath,
  saveMetadata,
  getMetadata,
  deleteFile,
  listFiles,
  getFileInfo,
  STORAGE_DIR,
  FILES_DIR
};
