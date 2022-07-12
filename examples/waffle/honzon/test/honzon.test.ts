import { Signer, evmChai } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ethers } from 'ethers';
import Honzon from '../build/Honzon.json';
import ADDRESS from '@acala-network/contracts/utils/AcalaAddress';
import { getTestProvider } from '../../utils';

use(solidity);
use(evmChai);

const provider = getTestProvider();
const testPairs = createTestPairs();
const HonzonABI = require('@acala-network/contracts/build/contracts/Honzon.json').abi;

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};
const dollar = BigNumber.from(formatAmount('1_000_000_000_000'));
const FixedU128 = BigNumber.from(formatAmount('1_000_000_000_000_000_000'));

const send = async (extrinsic: any, sender: any) => {
  return new Promise(async (resolve) => {
    extrinsic.signAndSend(sender, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });
};

describe('honzon', () => {
  let wallet: Signer;
  let walletTo: Signer;
  let honzon: Contract;
  let honzonPredeployed: Contract;

  before(async () => {
    [wallet, walletTo] = await provider.getWallets();
    honzon = await deployContract(wallet as any, Honzon);
    honzonPredeployed = new ethers.Contract(ADDRESS.HONZON, HonzonABI, wallet as any);
  });

  after(async () => {
    provider.api.disconnect();
  });

  it('honzon works', async () => {
    const evmAddress = ethers.Wallet.createRandom().address;
    console.log(evmAddress);

    expect((await honzon.getLiquidationRatio(ADDRESS.DOT)).toString()).to.eq('1500000000000000000');

    // u128 max
    expect((await honzon.getCurrentCollateralRatio(evmAddress, ADDRESS.DOT)).toString()).to.eq(
      '340282366920938463463374607431768211455'
    );

    expect((await honzon.getDebitExchangeRate(ADDRESS.DOT)).toString()).to.eq('100000000000000000');

    expect((await honzon.getPosition(evmAddress, ADDRESS.DOT)).toString()).to.eq('0,0');

    const interestRatePerSec = BigNumber.from('1').mul(FixedU128).div(BigNumber.from('100000'));
    const liquidationRatio = BigNumber.from('3').mul(FixedU128).div(BigNumber.from('2'));
    const liquidationPenalty = BigNumber.from('2').mul(FixedU128).div(BigNumber.from('10'));
    const requiredCollateralRatio = BigNumber.from('9').mul(FixedU128).div(BigNumber.from('5'));
    const maximumTotalDebitValue = dollar.mul(10000);
    console.log(
      interestRatePerSec,
      liquidationRatio,
      liquidationPenalty,
      requiredCollateralRatio,
      maximumTotalDebitValue
    );

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
    await send(updateHomaParams, await wallet.getSubstrateAddress());

    expect((await honzon.getLiquidationRatio(ADDRESS.DOT)).toString()).to.eq('1500000000000000000');

    // u32 max
    expect((await honzon.getCurrentCollateralRatio(evmAddress, ADDRESS.DOT)).toString()).to.eq(
      '340282366920938463463374607431768211455'
    );

    expect((await honzon.getDebitExchangeRate(ADDRESS.DOT)).toString()).to.eq('100000000000000000');

    expect((await honzon.getPosition(evmAddress, ADDRESS.DOT)).toString()).to.eq('0,0');

    const feedValues = provider.api.tx.acalaOracle.feedValues([[{ Token: 'DOT' }, BigNumber.from('1').mul(FixedU128)]]);
    await send(feedValues, await wallet.getSubstrateAddress());

    await expect(honzonPredeployed.adjustLoan(ADDRESS.DOT, dollar.mul(100), dollar.mul(10)))
      .to.emit(honzonPredeployed, 'AdjustedLoan')
      .withArgs(await wallet.getAddress(), ADDRESS.DOT, dollar.mul(100), dollar.mul(10));

    await expect(honzonPredeployed.closeLoanByDex(ADDRESS.DOT, dollar.mul(100)))
      .to.emit(honzonPredeployed, 'ClosedLoanByDex')
      .withArgs(await wallet.getAddress(), ADDRESS.DOT);
  });
});
