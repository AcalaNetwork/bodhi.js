import { ethers } from 'hardhat';
import { expect } from 'chai';

describe('HelloWorld contract', function () {
  it('returns the right value after the contract is deployed', async function () {
    const instance = await ethers.deployContract('HelloWorld');
    await instance.waitForDeployment();

    const value = await instance.helloWorld();
    expect(value).to.equal('Hello World!');
  });
});
