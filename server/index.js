require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Определяем режим работы: локальное хранилище или AWS S3
const USE_LOCAL_STORAGE = process.env.USE_LOCAL_STORAGE === 'true' || 
                          !process.env.AWS_ACCESS_KEY_ID || 
                          process.env.AWS_ACCESS_KEY_ID === 'your_access_key_here';

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
if (USE_LOCAL_STORAGE) {
  console.log('📁 Используется S3-подобное хранилище (локально + SQLite)');
  const s3Api = require('./routes/s3Api');
  app.use('/api/s3', s3Api);
  const localStorageRoutes = require('./routes/localStorage');
  app.use('/api/storage', localStorageRoutes);
} else {
  console.log('☁️  Используется AWS S3');
  const s3Routes = require('./routes/s3');
  app.use('/api/s3', s3Routes);
}

// Root: redirect to the client UI so http://localhost:5000/ opens the app
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
app.get('/', (req, res) => {
  res.redirect(302, clientUrl);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'S3 Storage API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Export app for testing; start server when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    if (USE_LOCAL_STORAGE) {
      console.log(`📁 S3: хранилище ./storage/s3_files, метаданные ./storage/s3_metadata.db`);
    } else {
      console.log(`📁 S3 Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
    }
  });
}

module.exports = app;
