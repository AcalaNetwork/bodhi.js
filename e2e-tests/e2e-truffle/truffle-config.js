const HDWalletProvider = require('@truffle/hdwallet-provider');

// pre-funded accounts for local mandala
const mnemonic = 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm';

module.exports = {
  networks: {
    acalaFork: {
      provider: () => new HDWalletProvider(mnemonic, 'http://localhost:8545'),
      network_id: 787,
    },
  },
  mocha: {
    timeout: 100000,
  },
  compilers: {
    solc: {
      version: '0.8.9',
    },
  },
};
