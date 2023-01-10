import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import type { Token } from '../typechain-types';

describe('New Runtime', function () {
  let deployer: Signer;
  let user: Signer;
  let deployerAddress: string;
  let userAddress: string;

  before('get user info', async () => {
    [deployer, user] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    userAddress = await user.getAddress();

    console.log({
      deployerAddress,
      userAddress
    });
  });

  describe('Hello World', function () {
    it('should deploy correctly', async function () {
      // const blockNumber = await ethers.provider.getBlockNumber();

      const HelloWorld = await ethers.getContractFactory('HelloWorld');
      const instance = await HelloWorld.deploy();
      const value = await instance.helloWorld();

      expect(value).to.equal('Hello World!');
    });
  });

  describe('Echo', function () {
    it('should deploy and scream correctly', async () => {
      const Echo = await ethers.getContractFactory('Echo');
      const echo = await Echo.deploy();
      let value = await echo.echo();

      expect(value).to.equal('Deployed successfully!');

      const newMsg = 'Goku';
      await echo.scream(newMsg);
      value = await echo.echo();
      expect(value).to.equal(newMsg);
    });
  });

  describe('ERC20', function () {
    let token: Token;
    const one = ethers.utils.parseEther('1');
    const initSupply = one.mul(123);

    before('deploy token', async () => {
      const Token = await ethers.getContractFactory('Token');
      token = await Token.deploy(initSupply);
    });

    it('should deploy correctly', async () => {
      expect(await token.name()).to.equal('Token');
      expect(await token.symbol()).to.equal('TKN');
      expect(await token.totalSupply()).to.equal(initSupply);
      expect(await token.balanceOf(deployerAddress)).to.equal(initSupply);
      expect(await token.balanceOf(userAddress)).to.equal(0);
      expect(await token.allowance(deployerAddress, userAddress)).to.equal(0);
    });

    it('should transfer correctly', async () => {
      const initialDeployerBalance = await token.balanceOf(deployerAddress);
      const initialUserBalance = await token.balanceOf(userAddress);

      const transferAmount = one.mul(15);
      await token.transfer(userAddress, transferAmount);

      const finalDeployerBalance = await token.balanceOf(deployerAddress);
      const finalUserBalance = await token.balanceOf(userAddress);

      expect(initialDeployerBalance.sub(transferAmount)).to.equal(finalDeployerBalance);
      expect(initialUserBalance.add(transferAmount)).to.equal(finalUserBalance);
    });
  });
});
