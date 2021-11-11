module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  testTimeout: 30000,
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/*.(test|spec).(ts|js)'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  testPathIgnorePatterns: [
    '/dist',
    '/lib',
    // TODO: remove these when testing locally, or after we have a public testnet WS endpoint
    'endpoint.test.ts'
  ],
  transformIgnorePatterns: ['@polkadot+util-crypto.*/node_modules/@polkadot/util-crypto']
};
