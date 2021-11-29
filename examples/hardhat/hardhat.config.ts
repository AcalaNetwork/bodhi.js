import * as dotenv from 'dotenv';

import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: '0.8.4',
  networks: {
    mandala: {
      url: 'http://localhost:8545',
      chainId: 595,
      // Development built-in default deployment account
      accounts: ['0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f'],
      gasPrice: 429496729610000
    }
  },
  mocha: {
    timeout: 200000
  }
};

export default config;
