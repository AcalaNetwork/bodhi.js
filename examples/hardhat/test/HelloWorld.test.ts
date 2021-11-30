import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('HelloWorld', function () {
  it("Should return the new greeting once it's changed", async function () {
    const HelloWorld = await ethers.getContractFactory('HelloWorld');
    const contract = await HelloWorld.deploy('Hello, world!');
    await contract.deployed();

    expect(await contract.greet()).to.equal('Hello, world!');

    const setGreetingTx = await contract.setGreeting('Hola, mundo!');

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await contract.greet()).to.equal('Hola, mundo!');
  });
});
