module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__/backend'],
  testMatch: ['**/*.test.js'],
  moduleNameMapper: { '^next/headers$': '<rootDir>/../backend/node_modules/next/headers.js', '^@/(.*)$': '<rootDir>/../backend/$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: '../backend/tsconfig.json' }] },
};
