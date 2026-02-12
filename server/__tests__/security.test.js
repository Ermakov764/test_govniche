/**
 * Security tests — path traversal, invalid keys, input validation.
 * Проверяют, что API отклоняет опасные и некорректные запросы.
 */
const request = require('supertest');

const app = require('../index');
const BASE = '/api/storage';

const encode = (s) => encodeURIComponent(s);

describe('Path traversal and invalid key (GET /files/:key)', () => {
  it('rejects key containing .. (path traversal)', async () => {
    const res = await request(app).get(`${BASE}/files/${encode('../../../etc/passwd')}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid key');
  });

  it('rejects key with encoded ..', async () => {
    const res = await request(app).get(`${BASE}/files/${encode('..%2F..%2Fetc%2Fpasswd')}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid key');
  });

  it('rejects key that is absolute path', async () => {
    const res = await request(app).get(`${BASE}/files/${encode('/etc/passwd')}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid key');
  });

  it('rejects empty key or returns 404 (route may match list)', async () => {
    const res = await request(app).get(`${BASE}/files/${encode('')}`);
    expect([400, 404, 200]).toContain(res.status);
    if (res.status === 200) expect(res.body).toHaveProperty('files');
  });
});

describe('Path traversal (GET /download/:key)', () => {
  it('rejects path traversal key', async () => {
    const res = await request(app).get(`${BASE}/download/${encode('../../secret')}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid key');
  });
});

describe('Path traversal (GET /preview/:key)', () => {
  it('rejects path traversal key', async () => {
    const res = await request(app).get(`${BASE}/preview/${encode('..%2F..%2Fenv')}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid key');
  });
});

describe('Path traversal (GET /files/:key/view)', () => {
  it('rejects path traversal key', async () => {
    const res = await request(app).get(`${BASE}/files/${encode('../../../etc/passwd')}/view`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid key');
  });
});

describe('Path traversal (DELETE /files/:key)', () => {
  it('rejects path traversal key', async () => {
    const res = await request(app).delete(`${BASE}/files/${encode('../../important')}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid key');
  });
});

describe('DELETE /files bulk with invalid keys', () => {
  it('reports invalid key in errors when one key is path traversal', async () => {
    const res = await request(app)
      .delete(`${BASE}/files`)
      .send({ keys: ['valid-looking-key', '../../../etc/passwd'] });
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeDefined();
    const invalidError = res.body.errors.find(e => e.error === 'Invalid key');
    expect(invalidError).toBeDefined();
  });
});

describe('Upload filename sanitization', () => {
  it('strips path traversal from original filename', async () => {
    const res = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('x'), '../../evil.txt');
    expect(res.status).toBe(200);
    expect(res.body.file.key).not.toMatch(/\.\./);
    expect(res.body.file.key).toMatch(/^\d+-evil\.txt$/);
    if (res.body.file?.key) {
      await request(app).delete(`${BASE}/files/${encode(res.body.file.key)}`);
    }
  });

  it('replaces path separators in filename', async () => {
    const res = await request(app)
      .post(`${BASE}/upload`)
      .attach('file', Buffer.from('y'), 'folder/sub/file.txt');
    expect(res.status).toBe(200);
    expect(res.body.file.key).not.toMatch(/[/\\]/);
    if (res.body.file?.key) {
      await request(app).delete(`${BASE}/files/${encode(res.body.file.key)}`);
    }
  });
});
