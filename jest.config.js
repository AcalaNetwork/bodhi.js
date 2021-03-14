const config = require('@open-web3/dev-config/config/jest.cjs');

module.exports = Object.assign({}, config, {
  modulePathIgnorePatterns: ['<rootDir>/build'],
  resolver: '@open-web3/dev-config/config/jest-resolver.cjs',
  transformIgnorePatterns: [
    '/node_modules/(?!@polkadot|@babel/runtime/helpers/esm/)'
  ]
});
