import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect, use } from 'chai';
import { ethers } from 'hardhat';
import { evmChai } from '@acala-network/bodhi';
import { BasicToken } from '../typechain';

use(evmChai);

describe('BasicToken', () => {
  let owner: SignerWithAddress;
  let walletTo: SignerWithAddress;
  let walletEmpty: SignerWithAddress;
  let token: BasicToken;

  before(async () => {
    [owner, walletTo, walletEmpty] = await ethers.getSigners();
    const BasicToken = await ethers.getContractFactory('BasicToken');
    token = await BasicToken.deploy(1000);
  });

  it('Assigns initial balance', async () => {
    const ownerBalance = await token.balanceOf(owner.address);
    expect(ownerBalance).to.equal(1000);
  });

  it('Transfer adds amount to destination account', async () => {
    await token.transfer(walletTo.address, 7);
    expect(await token.balanceOf(walletTo.address)).to.equal(7);
  });

  it('Transfer emits event', async () => {
    await expect(token.transfer(walletTo.address, 7))
      .to.emit(token, 'Transfer')
      .withArgs(owner.address, walletTo.address, 7);
  });

  it('Can not transfer above the amount', async () => {
    await expect(token.transfer(walletTo.address, 1007)).to.be.reverted;
  });

  it('Can not transfer from empty account', async () => {
    const tokenFromOtherWallet = token.connect(walletEmpty);
    await expect(tokenFromOtherWallet.transfer(owner.address, 1)).to.be.reverted;
  });
});
