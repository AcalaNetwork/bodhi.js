import { BodhiSigner, evmChai, BodhiProvider, getTestUtils } from '@acala-network/bodhi';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ethers } from 'ethers';
import Honzon from '../build/Honzon.json';
import ADDRESS from '@acala-network/contracts/utils/AcalaAddress';
import { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types';

use(solidity);
use(evmChai);

const HonzonABI = require('@acala-network/contracts/build/contracts/Honzon.json').abi;

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};
const dollar = BigNumber.from(formatAmount('1_000_000_000_000'));
const FixedU128 = BigNumber.from(formatAmount('1_000_000_000_000_000_000'));

const send = async (extrinsic: SubmittableExtrinsic<'promise'>, sender: AddressOrPair) =>
  new Promise((resolve) => {
    extrinsic.signAndSend(sender, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });

describe('honzon', () => {
  let wallet: BodhiSigner;
  let provider: BodhiProvider;
  let honzon: Contract;
  let honzonPredeployed: Contract;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    const testUtils = await getTestUtils(endpoint);
    wallet = testUtils.wallets[0];
    provider = testUtils.provider; // this is the same as wallet.provider
    honzon = await deployContract(wallet, Honzon);
    honzonPredeployed = new ethers.Contract(ADDRESS.HONZON, HonzonABI, wallet);
  });

  after(async () => {
    await wallet.provider.api.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it('honzon works', async () => {
    const evmAddress = ethers.Wallet.createRandom().address;
    console.log(evmAddress);

    expect((await honzon.getLiquidationRatio(ADDRESS.DOT)).toString()).to.eq(
      '10000000000000000000,0,1500000000000000000,100000000000000000,1500000000000000000'
    );

    // u128 max
    // FIXME: why doesn't work ?
    // expect((await honzon.getCurrentCollateralRatio(evmAddress, ADDRESS.DOT)).toString()).to.eq(
    //   '340282366920938463463374607431768211455'
    // );

    expect((await honzon.getDebitExchangeRate(ADDRESS.DOT)).toString()).to.eq('100000000000000000');

    expect((await honzon.getPosition(evmAddress, ADDRESS.DOT)).toString()).to.eq('0,0');

    const interestRatePerSec = BigNumber.from('1').mul(FixedU128).div(BigNumber.from('100000')).toBigInt();
    const liquidationRatio = BigNumber.from('3').mul(FixedU128).div(BigNumber.from('2')).toBigInt();
    const liquidationPenalty = BigNumber.from('2').mul(FixedU128).div(BigNumber.from('10')).toBigInt();
    const requiredCollateralRatio = BigNumber.from('9').mul(FixedU128).div(BigNumber.from('5')).toBigInt();
    const maximumTotalDebitValue = dollar.mul(10000).toBigInt();
    console.log({
      interestRatePerSec,
      liquidationRatio,
      liquidationPenalty,
      requiredCollateralRatio,
      maximumTotalDebitValue
    });

    const updateHomaParams = provider.api.tx.sudo.sudo(
      provider.api.tx.cdpEngine.setCollateralParams(
        { Token: 'DOT' },
        { NewValue: interestRatePerSec },
        { NewValue: liquidationRatio },
        { NewValue: liquidationPenalty },
        { NewValue: requiredCollateralRatio },
        { NewValue: maximumTotalDebitValue }
      )
    );
    await send(updateHomaParams, wallet.substrateAddress);

    expect((await honzon.getLiquidationRatio(ADDRESS.DOT)).toString()).to.eq(
      '10000000000000000,10000000000000,1500000000000000000,200000000000000000,1800000000000000000'
    );

    // u32 max
    // FIXME: why doesn't work ?
    // expect((await honzon.getCurrentCollateralRatio(evmAddress, ADDRESS.DOT)).toString()).to.eq(
    //   '340282366920938463463374607431768211455'
    // );

    expect((await honzon.getDebitExchangeRate(ADDRESS.DOT)).toString()).to.eq('100000000000000000');

    expect((await honzon.getPosition(evmAddress, ADDRESS.DOT)).toString()).to.eq('0,0');

    const feedValues = provider.api.tx.acalaOracle.feedValues([
      [{ Token: 'DOT' }, BigNumber.from('1').mul(FixedU128).toBigInt()]
    ]);
    await send(feedValues, wallet.substrateAddress);

    await expect(honzonPredeployed.adjustLoan(ADDRESS.DOT, dollar.mul(100), dollar.mul(10)))
      .to.emit(honzonPredeployed, 'AdjustedLoan')
      .withArgs(await wallet.getAddress(), ADDRESS.DOT, dollar.mul(100), dollar.mul(10));

    await expect(honzonPredeployed.closeLoanByDex(ADDRESS.DOT, dollar.mul(100)))
      .to.emit(honzonPredeployed, 'ClosedLoanByDex')
      .withArgs(await wallet.getAddress(), ADDRESS.DOT);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
});
