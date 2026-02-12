import axios from 'axios';

// Точка входа: /api/storage — старое локальное хранилище; /api/s3 — S3 API по ТЗ (локально + SQLite) или AWS
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/storage';
const IS_S3_API = API_URL.includes('/api/s3');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// owner_id для S3 API (от API Gateway приходит X-User-Id; в dev можно задать REACT_APP_USER_ID)
const defaultOwnerId = process.env.REACT_APP_USER_ID || 'local-user';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Превышено время ожидания запроса';
    } else if (!error.response) {
      error.message = 'Не удалось подключиться к серверу. Проверьте, что сервер запущен.';
    } else if (error.response.data?.error) {
      const errorMsg = error.response.data.error;
      if (errorMsg.includes('InvalidAccessKeyId') || errorMsg.includes('AWS Access Key')) {
        error.message = 'AWS credentials не настроены. Настройте .env с AWS credentials.';
      } else {
        error.message = errorMsg;
      }
    }
    return Promise.reject(error);
  }
);

// Загрузка одного файла
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  if (IS_S3_API) {
    formData.append('owner_id', defaultOwnerId);
    return api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  }
  return api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// Загрузка нескольких файлов
export const uploadFiles = async (files) => {
  if (IS_S3_API) {
    const results = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner_id', defaultOwnerId);
      const res = await api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      results.push(res.data);
    }
    return { data: { files: results } };
  }
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  return api.post('/upload-multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

// Список файлов (для S3 API нормализуем в формат { key, size, lastModified, originalName })
export const getFiles = async () => {
  const res = await api.get(IS_S3_API ? '/files' : '/files');
  if (IS_S3_API && Array.isArray(res.data)) {
    return {
      data: {
        files: res.data.map((f) => ({
          key: f.file_id,
          size: f.size,
          lastModified: f.created_at,
          originalName: f.filename
        }))
      }
    };
  }
  return res;
};

// Детали файла
export const getFileDetails = (key) => {
  return api.get(`/files/${encodeURIComponent(key)}`);
};

// Скачивание (S3 API: GET /files/:file_id отдаёт бинарный файл)
export const downloadFile = async (key) => {
  if (IS_S3_API) {
    const res = await api.get(`/files/${encodeURIComponent(key)}`, { responseType: 'blob' });
    return res;
  }
  return api.get(`/download/${encodeURIComponent(key)}`, { responseType: 'blob' });
};

// URL для превью (S3 API: тот же endpoint что и скачивание)
export const getPreviewUrl = async (key) => {
  if (IS_S3_API) {
    const base = API_URL.replace(/\/$/, '');
    return { data: { url: `${base}/files/${encodeURIComponent(key)}` } };
  }
  return api.get(`/preview/${encodeURIComponent(key)}`);
};

// Удаление одного файла
export const deleteFile = (key) => {
  return api.delete(`/files/${encodeURIComponent(key)}`);
};

// Удаление нескольких (S3 API не имеет bulk — удаляем по одному)
export const deleteFiles = async (keys) => {
  if (IS_S3_API) {
    await Promise.all(keys.map((k) => api.delete(`/files/${encodeURIComponent(k)}`)));
    return { data: {} };
  }
  return api.delete('/files', { data: { keys } });
};

export default api;
