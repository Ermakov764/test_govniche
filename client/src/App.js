import React, { useState, useEffect } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import AwsConfigWarning from './components/AwsConfigWarning';
import { getFiles, deleteFile, deleteFiles } from './services/api';

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [awsConfigError, setAwsConfigError] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      setAwsConfigError(false); // Сбрасываем ошибку AWS в локальном режиме
      const response = await getFiles();
      setFiles(response.data.files || []);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Неизвестная ошибка';
      setAwsConfigError(false); // В локальном режиме не показываем AWS ошибки
      setError('Ошибка загрузки файлов: ' + errorMessage);
      console.error('Load files error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploaded = () => {
    loadFiles();
  };

  const handleDelete = async (key) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот файл?')) {
      return;
    }

    try {
      await deleteFile(key);
      await loadFiles();
      setSelectedFiles(selectedFiles.filter(k => k !== key));
    } catch (err) {
      setError('Ошибка удаления файла: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    
    if (!window.confirm(`Вы уверены, что хотите удалить ${selectedFiles.length} файл(ов)?`)) {
      return;
    }

    try {
      await deleteFiles(selectedFiles);
      await loadFiles();
      setSelectedFiles([]);
    } catch (err) {
      setError('Ошибка удаления файлов: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleFileSelection = (key) => {
    setSelectedFiles(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const selectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(f => f.key));
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>📦 S3 Storage</h1>
          <p>Управление файлами в облачном хранилище</p>
        </header>

        {/* Показываем предупреждение только если используется AWS и есть ошибка */}
        {awsConfigError && process.env.REACT_APP_USE_LOCAL_STORAGE !== 'true' && <AwsConfigWarning />}

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <FileUpload onUploadSuccess={handleFileUploaded} />

        <div className="file-list-header">
          <h2>Файлы ({files.length})</h2>
          <div className="actions">
            {selectedFiles.length > 0 && (
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteSelected}
              >
                Удалить выбранные ({selectedFiles.length})
              </button>
            )}
            <button className="btn btn-secondary" onClick={loadFiles} disabled={loading}>
              {loading ? 'Загрузка...' : 'Обновить'}
            </button>
          </div>
        </div>

        <FileList
          files={files}
          loading={loading}
          selectedFiles={selectedFiles}
          onSelect={toggleFileSelection}
          onSelectAll={selectAll}
          onDelete={handleDelete}
          onRefresh={loadFiles}
        />
      </div>
    </div>
  );
}

export default App;
