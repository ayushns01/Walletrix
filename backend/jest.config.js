/**
 * Jest Configuration for Walletrix Backend
 * Comprehensive testing setup with ES modules support
 */

export default {
  // Test environment
  testEnvironment: 'node',

  // Module resolution
  moduleFileExtensions: ['js', 'json'],

  // Transform configuration
  transform: {
    '^.+\\.js$': ['babel-jest']
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/index.js', // Main entry point
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'clover'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Test execution
  maxWorkers: '50%',
  detectOpenHandles: true,
  forceExit: true,

  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'jest-results.xml'
    }]
  ]
};