module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/client/'],
  verbose: true,
  setupFiles: ['<rootDir>/server/__tests__/setup.js'],
};
