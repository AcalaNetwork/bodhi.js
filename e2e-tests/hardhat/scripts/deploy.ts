import { ethers } from 'hardhat';
import { formatEther } from 'ethers/lib/utils';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`deploying contracts with the account: ${deployer.address}` );
  console.log(`account balance: ${(formatEther(await deployer.getBalance())) }`);

  const HelloWorld = await ethers.getContractFactory('HelloWorld');
  const instance = await HelloWorld.deploy();
  await instance.deployed();
  console.log('HelloWorld address:', instance.address);

  const value = await instance.helloWorld();
  console.log(`stored value: ${value}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
