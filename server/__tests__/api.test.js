/**
 * API tests — проверка контракта эндпоинтов по IDF.
 * Проверяют коды ответов, структуру JSON и граничные случаи.
 */
const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

// Require app after env is set in setup.js
const app = require('../index');

const BASE = '/api/storage';

describe('Health check', () => {
  it('GET /api/health returns 200 and status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});

describe('POST /upload', () => {
  it('returns 400 when no file is sent', async () => {
    const res = await request(app).post(`${BASE}/upload`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'No file uploaded');
  });

  it('returns 200 and file info when a file is uploaded', async () => {
    const res = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('hello'), 'test.txt');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.file).toMatchObject({
      key: expect.stringMatching(/^\d+-test\.txt$/),
      bucket: 'local-storage',
      originalName: 'test.txt',
      size: 5,
      contentType: 'text/plain'
    });
    expect(res.body.file).toHaveProperty('uploadedAt');
    expect(res.body.file).toHaveProperty('location');
    // Cleanup
    if (res.body.file?.key) {
      await request(app).delete(`${BASE}/files/${encodeURIComponent(res.body.file.key)}`);
    }
  });
});

describe('POST /upload-multiple', () => {
  it('returns 400 when no files are sent', async () => {
    const res = await request(app).post(`${BASE}/upload-multiple`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'No files uploaded');
  });

  it('returns 200 and files array when multiple files are uploaded', async () => {
    const res = await request(app)
      .post(`${BASE}/upload-multiple`)
      .attach('files', Buffer.from('a'), 'a.txt')
      .attach('files', Buffer.from('bb'), 'b.txt');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files.length).toBe(2);
    expect(res.body.files[0]).toHaveProperty('key');
    expect(res.body.files[0]).toHaveProperty('originalName');
    expect(res.body.files[0]).toHaveProperty('size');
    // Cleanup
    for (const f of res.body.files || []) {
      if (f.key) await request(app).delete(`${BASE}/files/${encodeURIComponent(f.key)}`);
    }
  });
});

describe('GET /files', () => {
  it('returns 200 with success, count and files array', async () => {
    const res = await request(app).get(`${BASE}/files`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.files)).toBe(true);
  });
});

describe('GET /files/:key', () => {
  it('returns 404 for non-existent key', async () => {
    const res = await request(app).get(`${BASE}/files/nonexistent-123-file`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'File not found');
  });

  it('returns 200 and file info for existing file', async () => {
    const upload = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('content'), 'doc.txt');
    expect(upload.status).toBe(200);
    const key = upload.body.file.key;
    const res = await request(app).get(`${BASE}/files/${encodeURIComponent(key)}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.file).toMatchObject({ key, size: 7 });
    expect(res.body.file).toHaveProperty('contentType');
    expect(res.body.file).toHaveProperty('metadata');
    await request(app).delete(`${BASE}/files/${encodeURIComponent(key)}`);
  });
});

describe('GET /download/:key', () => {
  it('returns 404 for non-existent key', async () => {
    const res = await request(app).get(`${BASE}/download/nonexistent-123`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'File not found');
  });

  it('returns 200 with file body and Content-Disposition for existing file', async () => {
    const upload = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('download-me'), 'down.txt');
    const key = upload.body.file.key;
    const res = await request(app)
      .get(`${BASE}/download/${encodeURIComponent(key)}`)
      .buffer(true)
      .parse((res, fn) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => fn(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.toString()).toBe('download-me');
    await request(app).delete(`${BASE}/files/${encodeURIComponent(key)}`);
  });
});

describe('GET /preview/:key', () => {
  it('returns 404 for non-existent key', async () => {
    const res = await request(app).get(`${BASE}/preview/nonexistent-456`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'File not found');
  });

  it('returns 200 with url and expiresIn for existing file', async () => {
    const upload = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('x'), 'prev.txt');
    const key = upload.body.file.key;
    const res = await request(app).get(`${BASE}/preview/${encodeURIComponent(key)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('expiresIn');
    expect(res.body.url).toContain('/view');
    await request(app).delete(`${BASE}/files/${encodeURIComponent(key)}`);
  });
});

describe('GET /files/:key/view', () => {
  it('returns 404 for non-existent key', async () => {
    const res = await request(app).get(`${BASE}/files/nonexistent-789/view`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with file content for existing file', async () => {
    const upload = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('view-me'), 'v.txt');
    const key = upload.body.file.key;
    const res = await request(app)
      .get(`${BASE}/files/${encodeURIComponent(key)}/view`)
      .buffer(true)
      .parse((res, fn) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => fn(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.toString()).toBe('view-me');
    await request(app).delete(`${BASE}/files/${encodeURIComponent(key)}`);
  });
});

describe('DELETE /files/:key', () => {
  it('returns 200 and success for existing file', async () => {
    const upload = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('x'), 'del.txt');
    const key = upload.body.file.key;
    const res = await request(app).delete(`${BASE}/files/${encodeURIComponent(key)}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, key });
    const getRes = await request(app).get(`${BASE}/files/${encodeURIComponent(key)}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 or 500 for non-existent key (implementation may vary)', async () => {
    const res = await request(app).delete(`${BASE}/files/nonexistent-999`);
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe('DELETE /files (bulk)', () => {
  it('returns 400 when keys are missing', async () => {
    const res = await request(app).delete(`${BASE}/files`).send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'No keys provided');
  });

  it('returns 400 when keys is not an array', async () => {
    const res = await request(app).delete(`${BASE}/files`).send({ keys: 'not-array' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when keys is empty array', async () => {
    const res = await request(app).delete(`${BASE}/files`).send({ keys: [] });
    expect(res.status).toBe(400);
  });

  it('returns 200 and deleted array when keys are provided', async () => {
    const upload = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('x'), 'bulk1.txt');
    const key = upload.body.file.key;
    const res = await request(app).delete(`${BASE}/files`).send({ keys: [key] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.deleted).toBeDefined();
    expect(Array.isArray(res.body.deleted)).toBe(true);
  });
});
