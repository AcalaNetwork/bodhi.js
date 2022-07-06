import { expect, use } from 'chai';
import { ethers, Contract, BigNumber } from 'ethers';
import { deployContract, solidity } from 'ethereum-waffle';
import { AccountSigningKey, Signer, evmChai } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { getTestProvider } from '../../utils';

use(solidity);
use(evmChai);

const provider = getTestProvider();

const ERC20_ABI = require('@acala-network/contracts/build/contracts/Token.json').abi;

describe('ACAToken', () => {
  let wallet: Signer;
  let walletTo: Signer;
  let token: Contract;

  before(async () => {
    [wallet, walletTo] = await provider.getWallets();
    token = new ethers.Contract(ADDRESS.ACA, ERC20_ABI, wallet as any);
  });

  after(async () => {
    provider.api.disconnect();
  });

  it('get token name', async () => {
    const name = await token.name();
    expect(name).to.equal('Acala');
  });

  it('get token symbol', async () => {
    const symbol = await token.symbol();
    expect(symbol).to.equal('ACA');
  });

  it('get token decimals', async () => {
    const decimals = await token.decimals();
    expect(decimals).to.equal(12);
  });

  it('Transfer adds amount to destination account', async () => {
    const balance = await token.balanceOf(await walletTo.getAddress());
    await token.transfer(await walletTo.getAddress(), 7);
    expect((await token.balanceOf(await walletTo.getAddress())).sub(balance)).to.equal(7);
  });

  it('Transfer emits event', async () => {
    await expect(token.transfer(await walletTo.getAddress(), 7))
      .to.emit(token, 'Transfer')
      .withArgs(await wallet.getAddress(), await walletTo.getAddress(), 7);
  });

  it('Can not transfer above the amount', async () => {
    const balance = await token.balanceOf(await wallet.getAddress());
    await expect(token.transfer(await walletTo.getAddress(), balance.add(7))).to.be.reverted;
  });
});
