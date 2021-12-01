import { ethers } from 'hardhat';

const sleep = async (time: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, time));

async function startInfiniteLoop() {
  const HelloWorld = await ethers.getContractFactory('HelloWorld');

  let i = 0;
  while (true) {
    await HelloWorld.deploy('infinite hello world');
    await sleep(1000);
    console.log(`hello world deployed: ${++i}`);
  }
}

startInfiniteLoop().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
