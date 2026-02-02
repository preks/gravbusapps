/**
 * Jest Configuration for Gravity Business Apps
 *
 * Supports testing React components with TypeScript
 */

export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],

  // Performance optimizations
  maxWorkers: '50%', // Use half of available CPU cores
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Transform files with ts-jest
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      }
    ]
  },

  // Module path aliases (match tsconfig paths)
  moduleNameMapper: {
    // SVG and image files (must come before @/ pattern)
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    // FTL translation files
    '\\.ftl\\?raw$': '<rootDir>/src/__mocks__/ftlMock.js',
    // CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Design system mock
    '^@newwork/nw-design-system$': '<rootDir>/src/__mocks__/@newwork/nw-design-system.tsx',
    // Path alias (must come last to not interfere with other patterns)
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70
    }
  },

  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'html'],

  // Transform node_modules that use ES modules
  transformIgnorePatterns: ['node_modules/(?!(@newwork)/)'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  // Clear mocks between tests
  clearMocks: true,

  // Only show failed tests in CI
  verbose: false,

  // Fail fast on CI
  bail: process.env.CI ? 1 : 0,

  // Test timeout (ms)
  testTimeout: 10000
}
