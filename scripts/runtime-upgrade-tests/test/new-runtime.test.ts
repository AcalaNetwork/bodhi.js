import chai, { expect } from 'chai';
import { BigNumber, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { solidity } from 'ethereum-waffle';
import type { Token } from '../typechain-types';

// hardhat's default chai matchers are hardhat-chai-matchers
// whose `.to.be.revertedWith` doesn't work
// so we overrides using ethereum-waffle's chai matcher
chai.use(solidity);

type EthGas = {
  gasPrice: BigNumber;
  gasLimit: BigNumber;
};

describe('New Runtime', function () {
  let deployer: Signer;
  let user: Signer;
  let deployerAddress: string;
  let userAddress: string;
  let gas: EthGas;

  const one = ethers.utils.parseEther('1');

  before('get user info', async () => {
    [deployer, user] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    userAddress = await user.getAddress();

    gas = (await ethers.provider.send('eth_getEthGas', [])) as EthGas;

    console.log({
      deployerAddress,
      userAddress
    });
  });

  describe('Transfer native token', function () {
    it('works', async function () {
      const prevBalance = await user.getBalance();
      const sendValue = one.mul(10);
      await deployer.sendTransaction({
        to: userAddress,
        value: sendValue
      });
      const curBalance = await user.getBalance();

      expect(curBalance.sub(prevBalance)).to.equal(sendValue);
    });
  });

  describe('Hello World', function () {
    it('deploy', async function () {
      const HelloWorld = await ethers.getContractFactory('HelloWorld');
      const instance = await HelloWorld.deploy(gas);
      const value = await instance.helloWorld();

      expect(value).to.equal('Hello World!');
    });
  });

  describe('Echo', function () {
    it('deploy and scream', async () => {
      const Echo = await ethers.getContractFactory('Echo');
      const echo = await Echo.deploy(gas);
      let value = await echo.callStatic.echo();

      expect(value).to.equal('Deployed successfully!');

      let newMsg = 'Goku';
      await echo.scream(newMsg);
      value = await echo.callStatic.echo();
      expect(value).to.equal(newMsg);

      newMsg = 'Vegeta';
      await expect(echo.scream(newMsg)).to.emit(echo, 'NewEcho').withArgs(newMsg, 2);

      newMsg = 'Buu';
      await expect(echo.scream(newMsg)).to.emit(echo, 'NewEcho').withArgs(newMsg, 3);
    });
  });

  describe('ERC20', function () {
    let token: Token;
    const initSupply = one.mul(123456789);

    before('deploy token', async () => {
      const Token = await ethers.getContractFactory('Token');
      token = await Token.deploy(initSupply, gas);
    });

    it('initial state', async () => {
      expect(await token.name()).to.equal('Token');
      expect(await token.symbol()).to.equal('TKN');
      expect(await token.totalSupply()).to.equal(initSupply);
      expect(await token.balanceOf(deployerAddress)).to.equal(initSupply);
      expect(await token.balanceOf(userAddress)).to.equal(0);
      expect(await token.allowance(deployerAddress, userAddress)).to.equal(0);
    });

    it('transfer', async () => {
      const initialDeployerBalance = await token.balanceOf(deployerAddress);
      const initialUserBalance = await token.balanceOf(userAddress);

      const transferAmount = one.mul(15);
      await token.transfer(userAddress, transferAmount);

      const finalDeployerBalance = await token.balanceOf(deployerAddress);
      const finalUserBalance = await token.balanceOf(userAddress);

      expect(initialDeployerBalance.sub(transferAmount)).to.equal(finalDeployerBalance);
      expect(initialUserBalance.add(transferAmount)).to.equal(finalUserBalance);
    });

    it('handle events and reverts', async () => {
      const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
      const transferAmount = one.mul(3);

      await expect(token.transfer(userAddress, transferAmount, gas))
        .to.emit(token, 'Transfer')
        .withArgs(deployerAddress, userAddress, transferAmount);

      await expect(token.transfer(NULL_ADDRESS, transferAmount, gas)).to.be.revertedWith(
        'ERC20: transfer to the zero address'
      );

      await expect(token.transfer(userAddress, initSupply.add(one.mul(100)), gas)).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );
    });

    it('handle allowance', async () => {
      const getCurAllowance = () => token.allowance(deployerAddress, userAddress);

      /* ----- increase ----- */
      await token.approve(userAddress, 100);
      expect(await getCurAllowance()).to.equal(100);

      await token.increaseAllowance(userAddress, 50);
      expect(await getCurAllowance()).to.equal(150);

      await token.increaseAllowance(userAddress, 30);
      expect(await getCurAllowance()).to.equal(180);

      await expect(token.increaseAllowance(userAddress, 120))
        .to.emit(token, 'Approval')
        .withArgs(deployerAddress, userAddress, 120 + 180);

      /* ----- decrease ----- */
      await token.decreaseAllowance(userAddress, 140);
      expect(await getCurAllowance()).to.equal(160);

      await expect(token.decreaseAllowance(userAddress, 100000)).to.be.revertedWith(
        'ERC20: decreased allowance below zero'
      );
    });
  });
});
