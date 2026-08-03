/** @type {import('jest').Config} */
module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src/', '<rootDir>/tests/'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  workerIdleMemoryLimit: '500MB',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
