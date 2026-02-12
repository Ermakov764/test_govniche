const path = require('path');
const os = require('os');

// Use a dedicated temp directory for tests so we don't touch real storage
process.env.USE_LOCAL_STORAGE = 'true';
process.env.STORAGE_DIR = path.join(os.tmpdir(), `s3-storage-test-${Date.now()}`);
process.env.NODE_ENV = 'test';
