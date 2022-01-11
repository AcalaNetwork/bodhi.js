import * as dotenv from 'dotenv';

import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';
import 'solidity-coverage';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: '0.5.6',
  networks: {
    ganache: {
      url: 'http://localhost:7545',
      chainId: 1337,
      accounts: [
        '0xcd14aa4d0f9e4f18d57fba772cbfb152238e967c47940b871b9477cd85c94311',
        '0x8de6adfe0f6e5a96405a765e9b281a5f87b05b9766f2b94f25b3257fb7ede1bf',
        '0xefa9d28ccf5eb439839b58168e822213c4d4667b9d8e44807e74cfb808c46107',
        '0x46dd94bdf27a6765e98b6ff69d17311e2baaa999159d23aafca4f4caeba40d21',
        '0xb343ed3bf66b23c51b64e2596d7482177dab9ca7b0a1d88de675db4484fa04bb',
        '0xa4310aba50d91656d128f82df552f1b0a32e14f5c5e75a62291b06be0c36d304'
      ]
    },
    mandala: {
      url: 'http://localhost:8545',
      chainId: 595,
      accounts: [
        '0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f',
        '0x01392cd1a09fc0f4857742f0f0daa3ebd5a0f44a7dab48c23ccd331717b97b10',
        '0xccc579e34b614b8c4dca4bc5d6e305ff837bdf0de28bb7db425a5920093ffeda',
        '0x1570b994d8c79a9b10a8c5cd577c7fdb2b9461d01f7e84a0e07693212488a7ab',
        '0x7e751a72ca78c0fe04d23786d35e3499cefe64c78e6eb1b99939a7cbb00ef969',
        '0x2820f4e1dcde027b15eefdfeda5fb9be5f4499d33f34aeb0d74251925ceb9338'
      ]
    },
    mandalaPub: {
      url: 'https://tc7-eth.aca-dev.network',
      chainId: 595,
      accounts: ['0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f']
    }
  },
  mocha: {
    timeout: 200000
  }
};

export default config;
