import { TestProvider, Signer, evmChai } from '@acala-network/bodhi';
import { WsProvider } from '@polkadot/api';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
import Dex from '../build/Dex.json';
import ADDRESS from '@acala-network/contracts/utils/Address';

use(solidity);
use(evmChai);

const provider = new TestProvider({
  provider: new WsProvider('ws://127.0.0.1:9944')
});

describe('Dex', () => {
  let wallet: Signer;
  let dex: Contract;

  before(async () => {
    [wallet] = await provider.getWallets();
    dex = await deployContract(wallet as any, Dex);
  });

  after(async () => {
    provider.api.disconnect();
  });

  it('getLiquidityPool works', async () => {
    expect(await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD)).to.be.ok;
  });

  it('getLiquidityPool should not works', async () => {
    await expect(dex.getLiquidityPool(ADDRESS.ACA, '0x0000000000000000000001000000000000000000')).to.be.reverted;
  });

  it('getLiquidityTokenAddress works', async () => {
    expect(await dex.getLiquidityTokenAddress(ADDRESS.ACA, ADDRESS.AUSD)).to.equal(ADDRESS.LP_ACA_AUSD);
  });

  it('getLiquidityTokenAddress should not works', async () => {
    await expect(dex.getLiquidityTokenAddress(ADDRESS.ACA, '0x0000000000000000000001000000000000000000')).to.be
      .reverted;
  });

  it('getSwapTargetAmount works', async () => {
    expect(await dex.getSwapTargetAmount([ADDRESS.ACA, ADDRESS.AUSD], 1000)).to.be.ok;
    expect(await dex.getSwapTargetAmount([ADDRESS.ACA, ADDRESS.AUSD, ADDRESS.DOT], 1000)).to.be.ok;
  });

  it('getSwapTargetAmount should not works', async () => {
    try {
      await dex.getSwapTargetAmount([ADDRESS.ACA, ADDRESS.AUSD, ADDRESS.DOT, ADDRESS.RENBTC, ADDRESS.LDOT], 1000);
    } catch (error) {
      expect(error.message).to.contain('execution revert: Other("Dex get_swap_target_amount failed")');
    }
    try {
      await dex.getSwapTargetAmount([ADDRESS.ACA, ADDRESS.AUSD, ADDRESS.DOT, ADDRESS.LDOT, ADDRESS.RENBTC], 1000);
    } catch (error) {
      expect(error.message).to.contain('execution revert: Other("Dex get_swap_target_amount failed")');
    }
    try {
      await dex.getSwapTargetAmount([ADDRESS.ACA, '0x0000000000000000000001000000000000000000'], 1000);
    } catch (error) {
      expect(error.message).to.contain('Other("invalid currency id")');
    }
  });

  it('getSwapSupplyAmount works', async () => {
    expect(await dex.getSwapSupplyAmount([ADDRESS.ACA, ADDRESS.AUSD], 1000)).to.be.ok;
    expect(await dex.getSwapSupplyAmount([ADDRESS.ACA, ADDRESS.AUSD, ADDRESS.DOT], 1000)).to.be.ok;
  });

  it('getSwapSupplyAmount should not works', async () => {
    try {
      await dex.getSwapSupplyAmount([ADDRESS.ACA], 1000);
    } catch (error) {
      expect(error.message).to.contain('execution revert: Other("Dex get_swap_supply_amount failed")');
    }
    try {
      await dex.getSwapSupplyAmount([ADDRESS.ACA, ADDRESS.AUSD, ADDRESS.DOT, ADDRESS.LDOT, ADDRESS.RENBTC], 1000);
    } catch (error) {
      expect(error.message).to.contain('execution revert: Other("Dex get_swap_supply_amount failed")');
    }
    try {
      await dex.getSwapSupplyAmount([ADDRESS.ACA, '0x0000000000000000000001000000000000000000'], 1000);
    } catch (error) {
      expect(error.message).to.contain('Other("invalid currency id")');
    }
  });

  it('swapWithExactSupply works', async () => {
    let pool_0 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(
      await dex.swapWithExactSupply([ADDRESS.ACA, ADDRESS.AUSD], 1_000_000_000_000, 1, {
        value: 1_000_000_000_000,
        gasLimit: 2_000_000
      })
    ).to.be.ok;

    let pool_1 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(pool_1[0].sub(pool_0[0])).to.equal(1_000_000_000_000);

    let pool_2 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(
      await dex.swapWithExactSupply([ADDRESS.ACA, ADDRESS.AUSD, ADDRESS.ACA], 1_000_000_000_000, 1, {
        value: 1_000_000_000_000,
        gasLimit: 2_000_000
      })
    ).to.be.ok;
    let pool_3 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    //expect((pool_3[0].sub(pool_2[0]))).to.equal(2000992990);
  });

  it('swapWithExactSupply should not works', async () => {
    try {
      await dex.swapWithExactSupply([ADDRESS.ACA], 1000, 1);
    } catch (error) {
      expect(error.message).to.contain('execution revert: Other("InvalidTradingPathLength")');
    }
    try {
      await dex.swapWithExactSupply([ADDRESS.ACA, ADDRESS.AUSD, ADDRESS.DOT, ADDRESS.LDOT, ADDRESS.RENBTC], 1000, 1);
    } catch (error) {
      expect(error.message).to.contain('execution revert: Other("InvalidTradingPathLength")');
    }
    try {
      await dex.swapWithExactSupply([ADDRESS.ACA, '0x0000000000000000000001000000000000000000'], 1000, 1);
    } catch (error) {
      expect(error.message).to.contain('Other("invalid currency id")');
    }
  });

  it('swapWithExactTarget works', async () => {
    let pool_0 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(
      await dex.swapWithExactTarget([ADDRESS.ACA, ADDRESS.AUSD], 1, 1_000_000_000_000, {
        value: 1_000_000_000_000,
        gasLimit: 2_000_000
      })
    ).to.be.ok;

    let pool_1 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(pool_1[0].sub(pool_0[0])).to.equal(1);

    let pool_2 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(
      await dex.swapWithExactTarget([ADDRESS.ACA, ADDRESS.AUSD, ADDRESS.ACA], 1, 1_000_000_000_000, {
        value: 1_000_000_000_000,
        gasLimit: 2_000_000
      })
    ).to.be.ok;
    let pool_3 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(pool_3[0].sub(pool_2[0])).to.equal(1);
  });

  it('swapWithExactTarget should not works', async () => {
    try {
      await dex.swapWithExactTarget([ADDRESS.ACA], 1, 1000);
    } catch (error) {
      expect(error.message).to.contain('execution revert: Other("InvalidTradingPathLength")');
    }
    try {
      await dex.swapWithExactTarget([ADDRESS.ACA, ADDRESS.AUSD, ADDRESS.DOT, ADDRESS.LDOT, ADDRESS.RENBTC], 1, 1000);
    } catch (error) {
      expect(error.message).to.contain('execution revert: Other("InvalidTradingPathLength")');
    }
    try {
      await dex.swapWithExactTarget([ADDRESS.ACA, '0x0000000000000000000001000000000000000000'], 1, 1000);
    } catch (error) {
      expect(error.message).to.contain('Other("invalid currency id")');
    }
  });

  it('addLiquidity and removeLiquidity works', async () => {
    let pool_0 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(
      await dex.swapWithExactTarget([ADDRESS.ACA, ADDRESS.AUSD], 1_000_000_000_000, 1_000_000_000_000, {
        value: 1_000_000_000_000,
        gasLimit: 2_000_000
      })
    ).to.be.ok;

    let pool_1 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(pool_1[1].sub(pool_0[1])).to.equal(-1_000_000_000_000);

    expect(
      await dex.addLiquidity(ADDRESS.ACA, ADDRESS.AUSD, 1_000_000_000_000, 1_000_000_000_000, 0, {
        value: 1_000_000_000_000,
        gasLimit: 2_000_000
      })
    ).to.be.ok;

    let pool_2 = await dex.getLiquidityPool(ADDRESS.ACA, ADDRESS.AUSD);
    expect(pool_2[1].sub(pool_1[1])).to.equal(1_000_000_000_000);

    expect(
      await dex.removeLiquidity(ADDRESS.ACA, ADDRESS.AUSD, 100_000_000_000, 0, 0, {
        value: 1_000_000_000_000,
        gasLimit: 2_000_000
      })
    ).to.be.ok;
  });

  it('addLiquidity should not works', async () => {
    await expect(dex.addLiquidity(ADDRESS.ACA, '0x0000000000000000000001000000000000000000', 1, 1000, 0)).to.be
      .reverted;
  });

  it('removeLiquidity should not works', async () => {
    await expect(dex.addLiquidity(ADDRESS.ACA, '0x0000000000000000000001000000000000000000', 1, 1000, 0)).to.be
      .reverted;
  });
});
