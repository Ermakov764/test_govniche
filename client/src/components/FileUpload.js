import React, { useState, useRef } from 'react';
import { uploadFile, uploadFiles } from '../services/api';
import './FileUpload.css';

const FileUpload = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (files) => {
    try {
      setUploading(true);
      setError(null);
      setUploadProgress({});

      if (files.length === 1) {
        // Single file upload
        const file = files[0];
        setUploadProgress({ [file.name]: 'uploading' });
        
        await uploadFile(file);
        setUploadProgress({ [file.name]: 'success' });
      } else {
        // Multiple files upload
        files.forEach(file => {
          setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));
        });

        await uploadFiles(files);
        
        files.forEach(file => {
          setUploadProgress(prev => ({ ...prev, [file.name]: 'success' }));
        });
      }

      setTimeout(() => {
        setUploadProgress({});
        if (onUploadSuccess) onUploadSuccess();
      }, 1000);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Неизвестная ошибка';
      setError('Ошибка загрузки: ' + errorMessage);
      files.forEach(file => {
        setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }));
      });
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        
        <div className="upload-content">
          <div className="upload-icon">📤</div>
          <h3>Перетащите файлы сюда или нажмите для выбора</h3>
          <p>Поддерживается загрузка нескольких файлов</p>
          {uploading && <div className="upload-spinner">⏳</div>}
        </div>
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="upload-progress">
          {Object.entries(uploadProgress).map(([filename, status]) => (
            <div key={filename} className={`progress-item ${status}`}>
              <span className="filename">{filename}</span>
              <span className="status">
                {status === 'uploading' && '⏳ Загрузка...'}
                {status === 'success' && '✅ Успешно'}
                {status === 'error' && '❌ Ошибка'}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="upload-error">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
