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
    // TODO: remove these after we have available WS endpoint or test with local node
    'queries.test.ts',
    'evm-rpc-provider.test.ts',
    'rpc.test.ts'
  ],
  transformIgnorePatterns: ['@polkadot+util-crypto.*/node_modules/@polkadot/util-crypto']
};
