export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  transform: {
    '^.+\\.(ts|tsx|js)$': ['ts-jest', { useESM: false }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  roots: ['<rootDir>/tests'],
  transformIgnorePatterns: ['node_modules/(?!(dexie)/)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.jest.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  modulePaths: ['<rootDir>'],
};
