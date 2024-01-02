import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  solidity: '0.8.9',
  mocha: {
    timeout: 987654321,
  },
};

export default config;
