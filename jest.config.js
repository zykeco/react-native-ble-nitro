module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          compilerOptions: {
            module: 'commonjs',
            target: 'es2017',
            strict: false,
            esModuleInterop: true,
            skipLibCheck: true,
          },
        },
      },
    ],
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/plugin/build/',
    '/nitrogen/generated/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.nitro.ts',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/node_modules/react-native',
    // Map .js extensions to .ts files for ES module imports in tests
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};