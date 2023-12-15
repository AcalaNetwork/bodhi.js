import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { parseEther, parseUnits } from 'ethers/lib/utils';

import { ERC20__factory, type Token } from '../typechain-types';

const one = parseEther('1');

describe('evm operations', function () {
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;
  let deployerAddress: string;
  let userAddress: string;

  before('get user info', async () => {
    [deployer, user] = await ethers.getSigners();
    deployerAddress = deployer.address;
    userAddress = user.address;

    console.log({
      deployerAddress,
      userAddress,
    });
  });

  describe('Transfer native token', function () {
    it('works', async function () {
      const prevBalance = await user.getBalance();
      const sendValue = one.mul(10);
      await (await deployer.sendTransaction({
        to: userAddress,
        value: sendValue,
      })).wait();
      const curBalance = await user.getBalance();

      expect(curBalance.sub(prevBalance)).to.equal(sendValue);
    });
  });

  describe('Transfer predeployed Token', function () {
    it('works', async function () {
      const ACA_ADDR = '0x0000000000000000000100000000000000000000';
      const KAR_ADDR = '0x0000000000000000000100000000000000000080';
      const tokenAddr = network.name === 'karura' ? KAR_ADDR : ACA_ADDR
      const aca = ERC20__factory.connect(tokenAddr, deployer);

      // await new Promise((resolve) => setTimeout(resolve, 3000));

      const prevBalance = await user.getBalance();
      const sendValue = '5.123';
      await (await aca.transfer(userAddress, parseUnits(sendValue, 12))).wait();
      const curBalance = await user.getBalance();

      expect(curBalance.sub(prevBalance)).to.equal(parseEther(sendValue));
    });
  });

  describe('Hello World', function () {
    it('deploy', async function () {
      const HelloWorld = await ethers.getContractFactory('HelloWorld');
      const instance = await HelloWorld.deploy();
      const value = await instance.helloWorld();

      expect(value).to.equal('Hello World!');
    });
  });

  describe('Echo', function () {
    it('deploy and scream', async () => {
      const Echo = await ethers.getContractFactory('Echo');
      const echo = await Echo.deploy();
      let value = await echo.echo();

      expect(value).to.equal('Deployed successfully!');

      let newMsg = 'Goku';
      await (await echo.scream(newMsg)).wait();
      value = await echo.echo();
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
      token = await Token.deploy(initSupply);
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
      await (await token.transfer(userAddress, transferAmount)).wait();

      const finalDeployerBalance = await token.balanceOf(deployerAddress);
      const finalUserBalance = await token.balanceOf(userAddress);

      expect(initialDeployerBalance.sub(transferAmount)).to.equal(finalDeployerBalance);
      expect(initialUserBalance.add(transferAmount)).to.equal(finalUserBalance);
    });

    it('handle events and reverts', async () => {
      const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
      const transferAmount = one.mul(3);

      await expect(token.transfer(userAddress, transferAmount))
        .to.emit(token, 'Transfer')
        .withArgs(deployerAddress, userAddress, transferAmount);

      await expect(token.transfer(NULL_ADDRESS, transferAmount)).to.be.revertedWith(
        'ERC20: transfer to the zero address',
      );

      await expect(token.transfer(userAddress, initSupply.add(one.mul(100)), )).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance',
      );
    });

    it('handle allowance', async () => {
      const getCurAllowance = () => token.allowance(deployerAddress, userAddress);

      /* ----- increase ----- */
      await (await token.approve(userAddress, 100)).wait();
      expect(await getCurAllowance()).to.equal(100);

      await (await token.increaseAllowance(userAddress, 50)).wait();
      expect(await getCurAllowance()).to.equal(150);

      await (await token.increaseAllowance(userAddress, 30)).wait();
      expect(await getCurAllowance()).to.equal(180);

      await expect(token.increaseAllowance(userAddress, 120))
        .to.emit(token, 'Approval')
        .withArgs(deployerAddress, userAddress, 120 + 180);

      /* ----- decrease ----- */
      await (await token.decreaseAllowance(userAddress, 140)).wait();
      expect(await getCurAllowance()).to.equal(160);

      await expect(token.decreaseAllowance(userAddress, 100000)).to.be.revertedWith(
        'ERC20: decreased allowance below zero',
      );
    });
  });
});
