import { expect, use } from 'chai';
import { ethers, Contract } from 'ethers';
import { solidity } from 'ethereum-waffle';
import { getTestUtils, Signer, evmChai } from '@acala-network/bodhi';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';

use(solidity);
use(evmChai);

const ERC20_ABI = require('@acala-network/contracts/build/contracts/Token.json').abi;
const DEX_ABI = require('@acala-network/contracts/build/contracts/DEX.json').abi;

describe('LP ACA-AUSD Token', () => {
  let wallet: Signer;
  let walletTo: Signer;
  let dex: Contract;
  let token: Contract;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    [wallet, walletTo] = (await getTestUtils(endpoint)).wallets;
    dex = new ethers.Contract(ADDRESS.DEX, DEX_ABI, wallet);
    token = new ethers.Contract(ADDRESS.LP_ACA_AUSD, ERC20_ABI, wallet);

    let pool_1 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(
      await dex.addLiquidity(ADDRESS.ACA, ADDRESS.AUSD, 1_000_000_000_000, 1_000_000_000_000, 0, {
        gasLimit: 2_000_000
      })
    ).to.be.ok;
    let pool_2 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(pool_2[1].sub(pool_1[1])).to.equal(1_000_000_000_000);
  });

  after(async () => {
    await wallet.provider.api.disconnect();
  });

  it('get token name', async () => {
    const name = await token.name();
    expect(name).to.equal('LP Acala - Acala Dollar');
  });

  it('get token symbol', async () => {
    const symbol = await token.symbol();
    expect(symbol).to.equal('LP_ACA_AUSD');
  });

  it('get token decimals', async () => {
    const decimals = await token.decimals();
    expect(decimals).to.equal(12);
  });

  it('Transfer adds amount to destination account', async () => {
    const balance = await token.balanceOf(await walletTo.getAddress());
    await token.transfer(await walletTo.getAddress(), 700_000_000_000);
    expect((await token.balanceOf(await walletTo.getAddress())).sub(balance)).to.equal(700_000_000_000);
  });

  it('Transfer emits event', async () => {
    await expect(token.transfer(await walletTo.getAddress(), 700_000_000_000))
      .to.emit(token, 'Transfer')
      .withArgs(await wallet.getAddress(), await walletTo.getAddress(), 700_000_000_000);
  });

  it('Can not transfer above the amount', async () => {
    const balance = await token.balanceOf(await wallet.getAddress());
    await expect(token.transfer(await walletTo.getAddress(), balance.add(7))).to.be.reverted;
  });
});
