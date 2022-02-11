// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from 'hardhat';
import { calcEthereumTransactionParams } from '@acala-network/eth-providers';

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const ethParams = calcEthereumTransactionParams({
    gasLimit: '2100001',
    validUntil: '360001',
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });

  // We get the contract to deploy
  const HelloWorld = await ethers.getContractFactory('HelloWorld');
  const contract = await HelloWorld.deploy('Hello, Hardhat!', {
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit
  });

  await contract.deployed();

  console.log('HelloWorld deployed to:', contract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
