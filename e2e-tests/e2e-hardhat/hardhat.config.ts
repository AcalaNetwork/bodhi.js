import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: '0.8.9',
  networks: {
    acalaFork: {
      chainId: 787,
      url: 'http://127.0.0.1:8545',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: 'm/44\'/60\'/0\'/0',
      },
    },
  },
  mocha: {
    timeout: 100000,
  },
};

export default config;
