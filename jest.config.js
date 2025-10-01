/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'unit/integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.ts',
        '<rootDir>/tests/integration/**/*.test.ts',
        '<rootDir>/tests/security/**/*.test.ts'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/test/(.*)$': '<rootDir>/tests/$1'
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true
          }
        }]
      },
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/app/layout.tsx',
        '!src/app/page.tsx',
        '!**/node_modules/**'
      ]
    },
    {
      displayName: 'components',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/tests/components/**/*.test.tsx',
        '<rootDir>/tests/e2e/**/*.test.tsx'
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/setup-components.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/test/(.*)$': '<rootDir>/tests/$1',
        '\\.(css|less|scss|sass)$': '<rootDir>/tests/__mocks__/styleMock.js'
      },
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true
          }
        }]
      },
      collectCoverageFrom: [
        'src/components/**/*.{ts,tsx}',
        'src/app/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/app/layout.tsx',
        '!src/app/page.tsx',
        '!**/node_modules/**'
      ]
    }
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/lib/auth/**/*.ts': {
      branches: 90,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './src/app/api/admin/auth/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache'
};