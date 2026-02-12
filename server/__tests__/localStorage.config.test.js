/**
 * Unit tests for localStorage config — isKeySafe, getFilePath, getMetadataPath.
 * Проверяют логику безопасного ключа без поднятия HTTP-сервера.
 */
const path = require('path');
const os = require('os');

// Set test env before requiring config
process.env.STORAGE_DIR = path.join(os.tmpdir(), 'storage-config-test');
const {
  getFilePath,
  getMetadataPath,
  initStorage,
  FILES_DIR
} = require('../config/localStorage');

describe('localStorage config', () => {
  beforeAll(async () => {
    await initStorage();
  });

  describe('isKeySafe (via getFilePath/getMetadataPath)', () => {
    it('accepts normal filename', () => {
      expect(() => getFilePath('123-doc.pdf')).not.toThrow();
      expect(getFilePath('123-doc.pdf')).toBe(path.join(FILES_DIR, '123-doc.pdf'));
    });

    it('rejects key with ..', () => {
      expect(() => getFilePath('../../etc/passwd')).toThrow('Invalid key');
      expect(() => getMetadataPath('a/../b')).toThrow('Invalid key');
    });

    it('rejects absolute path', () => {
      expect(() => getFilePath('/etc/passwd')).toThrow('Invalid key');
    });

    it('rejects empty key', () => {
      expect(() => getFilePath('')).toThrow('Invalid key');
    });

    it('rejects null/undefined (getFilePath throws)', () => {
      expect(() => getFilePath(null)).toThrow('Invalid key');
      expect(() => getFilePath(undefined)).toThrow('Invalid key');
    });

    it('rejects non-string', () => {
      expect(() => getFilePath(123)).toThrow('Invalid key');
    });
  });

  describe('path resolution', () => {
    it('resolved file path stays inside FILES_DIR', () => {
      const resolved = path.resolve(getFilePath('normal-file.txt'));
      const base = path.resolve(FILES_DIR);
      expect(resolved.startsWith(base)).toBe(true);
    });
  });
});
