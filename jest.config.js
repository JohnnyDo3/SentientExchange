module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/', // Skip E2E tests with Jest ESM issues
    '/tests/unit/mcp/SSETransport.test.ts', // Skip SSETransport test with ESM issues
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|jayson|@modelcontextprotocol)/)',
  ],
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
  testTimeout: 30000,
};
