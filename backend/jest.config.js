export default {

  testEnvironment: 'node',

  moduleFileExtensions: ['js', 'json'],

  transform: {
    '^.+\\.js$': ['babel-jest']
  },

  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],

  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/index.js',
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

  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  testTimeout: 30000,

  verbose: true,

  clearMocks: true,
  restoreMocks: true,

  errorOnDeprecated: true,

  maxWorkers: '50%',
  detectOpenHandles: true,
  forceExit: true,

  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'jest-results.xml'
    }]
  ]
};
