import { expect } from 'chai';
import { ethers } from 'hardhat';
import { calcEthereumTransactionParams } from '@acala-network/eth-providers';

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

describe('HelloWorld', function () {
  it("Should return the new greeting once it's changed", async function () {
    const ethParams = calcEthereumTransactionParams({
      gasLimit: '2100001',
      validUntil: '360001',
      storageLimit: '64001',
      txFeePerGas,
      storageByteDeposit
    });

    const HelloWorld = await ethers.getContractFactory('HelloWorld');
    const contract = await HelloWorld.deploy('Hello, world!', {
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit
    });

    await contract.deployed();

    expect(await contract.greet()).to.equal('Hello, world!');

    const setGreetingTx = await contract.setGreeting('Hola, mundo!', {
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit
    });

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await contract.greet()).to.equal('Hola, mundo!');
  });
});
