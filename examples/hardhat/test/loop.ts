import { ethers } from 'hardhat';
import { calcEthereumTransactionParams } from '@acala-network/eth-providers';

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

export const sleep = async (time: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval: number = 3000): Promise<void> => {
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '2100001',
    validUntil: '360001',
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });

  console.log('infinite hello world started!');
  let count = 0;
  while (true) {
    const HelloWorld = await ethers.getContractFactory('HelloWorld');
    const contract = await HelloWorld.deploy('Hello, world!', {
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit
    });

    console.log(`infinite hello world count: ${++count}`);
    await sleep(interval);
  }
};

loop();
