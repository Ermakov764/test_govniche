import React, { useState } from 'react';
import { downloadFile, getPreviewUrl } from '../services/api';
import './FileList.css';

const FileList = ({ 
  files, 
  loading, 
  selectedFiles, 
  onSelect, 
  onSelectAll, 
  onDelete, 
  onRefresh 
}) => {
  const [downloading, setDownloading] = useState({});
  const [previewing, setPreviewing] = useState({});

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (key, file) => {
    try {
      setDownloading(prev => ({ ...prev, [key]: true }));
      const response = await downloadFile(key);
      const disp = response.headers['content-disposition'];
      const match = disp && disp.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
      const downloadName = (match && decodeURIComponent(match[1].replace(/^"|"$/g, ''))) || file?.originalName || key.split('/').pop();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Ошибка скачивания: ' + (err.response?.data?.error || err.message));
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handlePreview = async (key) => {
    try {
      setPreviewing(prev => ({ ...prev, [key]: true }));
      const { data } = await getPreviewUrl(key);
      const previewUrl = data?.url;
      if (previewUrl) {
        window.open(previewUrl, '_blank');
      } else {
        alert('Не удалось получить URL превью');
      }
    } catch (err) {
      alert('Ошибка открытия превью: ' + (err.response?.data?.error || err.message));
    } finally {
      setTimeout(() => {
        setPreviewing(prev => ({ ...prev, [key]: false }));
      }, 1000);
    }
  };

  const getFileIcon = (key) => {
    const ext = key.split('.').pop()?.toLowerCase();
    const iconMap = {
      'pdf': '📄',
      'doc': '📝', 'docx': '📝',
      'xls': '📊', 'xlsx': '📊',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
      'mp4': '🎬', 'avi': '🎬', 'mov': '🎬',
      'mp3': '🎵', 'wav': '🎵',
      'zip': '📦', 'rar': '📦', '7z': '📦',
      'txt': '📃',
      'html': '🌐', 'css': '🎨', 'js': '💻'
    };
    return iconMap[ext] || '📎';
  };

  if (loading && files.length === 0) {
    return (
      <div className="file-list-loading">
        <div className="spinner">⏳</div>
        <p>Загрузка файлов...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="file-list-empty">
        <div className="empty-icon">📁</div>
        <h3>Нет файлов</h3>
        <p>Загрузите файлы, чтобы начать работу</p>
      </div>
    );
  }

  return (
    <div className="file-list">
      <div className="file-list-controls">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={selectedFiles.length === files.length && files.length > 0}
            onChange={onSelectAll}
          />
          <span>Выбрать все</span>
        </label>
      </div>

      <div className="file-table">
        <div className="file-table-header">
          <div className="col-checkbox"></div>
          <div className="col-name">Имя файла</div>
          <div className="col-size">Размер</div>
          <div className="col-date">Дата</div>
          <div className="col-actions">Действия</div>
        </div>

        <div className="file-table-body">
          {files.map((file) => (
            <div 
              key={file.key} 
              className={`file-row ${selectedFiles.includes(file.key) ? 'selected' : ''}`}
            >
              <div className="col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.key)}
                  onChange={() => onSelect(file.key)}
                />
              </div>
              <div className="col-name">
                <span className="file-icon">{getFileIcon(file.key)}</span>
                <span className="file-name" title={file.originalName || file.key}>
                  {file.originalName || file.key.split('/').pop()}
                </span>
              </div>
              <div className="col-size">
                {formatFileSize(file.size)}
              </div>
              <div className="col-date">
                {formatDate(file.lastModified)}
              </div>
              <div className="col-actions">
                <button
                  className="action-btn preview-btn"
                  onClick={() => handlePreview(file.key)}
                  disabled={previewing[file.key]}
                  title="Превью"
                >
                  {previewing[file.key] ? '⏳' : '👁️'}
                </button>
                <button
                  className="action-btn download-btn"
                  onClick={() => handleDownload(file.key, file)}
                  disabled={downloading[file.key]}
                  title="Скачать"
                >
                  {downloading[file.key] ? '⏳' : '⬇️'}
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => onDelete(file.key)}
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FileList;
