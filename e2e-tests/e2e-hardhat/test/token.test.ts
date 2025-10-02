import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';

import { Token } from '../typechain-types';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('Token contract', () => {
  let token: Token;
  let deployer: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let deployerAddress: string;
  let userAddress: string;

  before(async () => {
    [deployer, user] = await ethers.getSigners();
    deployerAddress = deployer.address;
    userAddress = user.address;

    token = await ethers.deployContract('Token', [1234567890]);
    await token.waitForDeployment();
  });

  describe('Deployment', () => {
    it('should have correct info', async () => {
      expect(await token.name()).to.equal('Token');
      expect(await token.symbol()).to.equal('TKN');
      expect(await token.totalSupply()).to.equal(1234567890);
      expect(await token.balanceOf(deployerAddress)).to.equal(1234567890);
      expect(await token.balanceOf(userAddress)).to.equal(0);
      expect(await token.allowance(deployerAddress, userAddress)).to.equal(0);
      expect(await token.allowance(userAddress, deployerAddress)).to.equal(0);
    });
  });

  describe('Transfer', () => {
    it('should update balance and emit event', async () => {
      const initialDeployerBalance = await token.balanceOf(deployerAddress);
      const initialUserBalance = await token.balanceOf(userAddress);

      const tx = await token.transfer(userAddress, 500);
      await tx.wait();

      const finalDeployerBalance = await token.balanceOf(deployerAddress);
      const finalUserBalance = await token.balanceOf(userAddress);

      expect(initialDeployerBalance - 500n).to.equal(finalDeployerBalance);
      expect(initialUserBalance + 500n).to.equal(finalUserBalance);

      await expect(tx)
        .to.emit(token, 'Transfer')
        .withArgs(deployerAddress, userAddress, 500);
    });

    it('should revert the transfer to a 0x0 address', async () => {
      await expect(token.transfer(NULL_ADDRESS, 100)).to.be.revertedWith(
        'ERC20: transfer to the zero address'
      );
    });

    it('should revert if trying to transfer amount bigger than balance', async () => {
      const bal = await token.balanceOf(deployerAddress);
      await expect(token.transfer(userAddress, bal + 1n)).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance'
      );
    });

  });

  describe('Allowances', () => {
    describe('approve()', () => {
      it('should grant allowance when the caller has enough funds', async () => {
        const tx = await token.approve(userAddress, 100);
        await tx.wait();

        await expect(tx)
          .to.emit(token, 'Approval')
          .withArgs(deployerAddress, userAddress, 100);

        expect(await token.allowance(deployerAddress, userAddress)).to.equal(100);
      });

      it('should grant allowance', async () => {
        await (await token.approve(userAddress, 12345678900)).wait();

        expect(await token.allowance(deployerAddress, userAddress)).to.equal(12345678900);
      });

      it('should revert when trying to give allowance to 0x0 address', async () => {
        await expect(token.approve(NULL_ADDRESS, 100)).to.be.revertedWith(
          'ERC20: approve to the zero address'
        );
      });
    });

    describe('increaseAllowance()', () => {
      it('should allow to increase allowance', async () => {
        const initialAllowance = await token.allowance(deployerAddress, userAddress);

        await (await token.increaseAllowance(userAddress, 50)).wait();

        const finalAllowance = await token.allowance(deployerAddress, userAddress);
        expect(finalAllowance - initialAllowance).to.equal(50);
      });

      it('should emit Approval event', async () => {
        const curAllowance = await token.allowance(deployerAddress, userAddress);
        const tx = await token.increaseAllowance(userAddress, 50);
        await tx.wait();

        await expect(tx)
          .to.emit(token, 'Approval')
          .withArgs(deployerAddress, userAddress, curAllowance + 50n);
      });
    });

    describe('transferFrom()', () => {
      it('should allow to transfer tokens when allowance is given', async () => {
        await (await token.approve(userAddress, 100)).wait();

        const initialBalance = await token.balanceOf(userAddress);

        const transfer = await deployer.sendTransaction({
          to: userAddress,
          value: ethers.parseEther('1.0'), // 1 ETH
        });
        await transfer.wait();
        const userBalance = await ethers.provider.getBalance(userAddress);
        console.log(`initialBalance: ${initialBalance}, userBalance: ${userBalance}`);

        const tx = await token.connect(user).transferFrom(deployerAddress, userAddress, 50);
        await tx.wait();

        await expect(tx)
          .to.emit(token, 'Transfer')
          .withArgs(deployerAddress, userAddress, 50);

        const finalBalance = await token.balanceOf(userAddress);
        expect(initialBalance + 50n).to.equal(finalBalance);
      });

      it('should revert when tring to transfer more than allowed amount', async () => {
        await (await token.approve(userAddress, 100)).wait();
        await expect(token.connect(user).transferFrom(deployerAddress, userAddress, 1000)).to.be.revertedWith('ERC20: insufficient allowance');
      });

      it('should revert when transfering to 0x0 address', async () => {
        await (await token.approve(userAddress, 100)).wait();
        await expect(token.connect(user).transferFrom(deployerAddress, NULL_ADDRESS, 50)).to.be.revertedWith(
          'ERC20: transfer to the zero address'
        );
      });

      it('should revert when owner doesn\'t have enough funds', async () => {
        const bal = await token.balanceOf(deployerAddress);
        const transferAmount = bal + 1n;
        await (await token.approve(userAddress, transferAmount)).wait();

        await expect(
          token.connect(user).transferFrom(deployerAddress, userAddress, transferAmount)
        ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      });
    });
  });

});
