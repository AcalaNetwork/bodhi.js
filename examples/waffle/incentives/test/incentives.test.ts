import { BodhiSigner, BodhiProvider, getTestUtils } from '@acala-network/bodhi';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ethers } from 'ethers';
import Incentives from '../build/Incentives.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types';

import { evmChai } from '../../evm-chai';

use(solidity);
use(evmChai);

const IncentivesABI = require('@acala-network/contracts/build/contracts/Incentives.json').abi;

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};

const FixedU128 = BigNumber.from(formatAmount('1_000_000_000_000_000_000'));

const send = async (extrinsic: SubmittableExtrinsic<'promise'>, sender: AddressOrPair) =>
  new Promise((resolve) => {
    extrinsic.signAndSend(sender, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });

describe('incentives', () => {
  let wallet: Signer;
  let provider: BodhiProvider;
  let incentives: Contract;
  let incentivesPredeployed: Contract;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    const testUtils = await getTestUtils(endpoint);
    wallet = testUtils.wallets[0];
    provider = testUtils.provider; // this is the same as wallet.provider
    incentives = await deployContract(wallet, Incentives);
    incentivesPredeployed = new ethers.Contract(ADDRESS.INCENTIVES, IncentivesABI, wallet);
  });

  after(async () => {
    await wallet.provider.api.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it('incentives getIncentiveRewardAmount works', async () => {
    const updateIncentiveRewards = provider.api.tx.sudo.sudo(
      provider.api.tx.incentives.updateIncentiveRewards([
        [
          {
            Loans: {
              Token: 'DOT'
            }
          },
          [
            [
              {
                Token: 'DOT'
              },
              100
            ]
          ]
        ]
      ])
    );
    await send(updateIncentiveRewards, wallet.substrateAddress);

    expect(await incentives.getIncentiveRewardAmount(0, ADDRESS.DOT, ADDRESS.DOT)).to.equal(100);
    expect(await incentives.getIncentiveRewardAmount(1, ADDRESS.DOT, ADDRESS.DOT)).to.equal(0);
    // TODO: enum doesn't match
    // expect(await incentives.getIncentiveRewardAmount(2, ADDRESS.DOT, ADDRESS.DOT)).to.be.reverted;
  });

  it('incentives getClaimRewardDeductionRate works', async () => {
    const newRate = FixedU128.div(BigNumber.from('10')).toBigInt(); // 1/10
    const updateClaimRewardDeductionRates = provider.api.tx.sudo.sudo(
      provider.api.tx.incentives.updateClaimRewardDeductionRates([
        [
          {
            Dex: {
              DexShare: [{ Token: 'ACA' }, { Token: 'AUSD' }]
            }
          },
          newRate
        ]
      ])
    );
    await send(updateClaimRewardDeductionRates, wallet.substrateAddress);

    const curRate = await incentives.getClaimRewardDeductionRate(1, ADDRESS.LP_ACA_AUSD);
    expect(curRate.toBigInt()).to.equal(newRate);
  });

  it('incentives getPendingRewards works', async () => {
    const Rate = FixedU128.div(BigNumber.from('2')); // 50/100
    const updateClaimRewardDeductionRates = provider.api.tx.sudo.sudo(
      provider.api.tx.incentives.updateClaimRewardDeductionRates([
        [
          {
            Loans: {
              Token: 'ACA'
            }
          },
          Rate.toBigInt()
        ]
      ])
    );
    await send(updateClaimRewardDeductionRates, wallet.substrateAddress);

    expect(
      (
        await incentives.getPendingRewards([ADDRESS.ACA, ADDRESS.AUSD], 0, ADDRESS.ACA, await wallet.getAddress())
      ).toString()
    ).to.equal('0,0');
  });

  it('incentives depositDexShare works', async () => {
    const updateBalance = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(
        wallet.substrateAddress,
        {
          DexShare: [{ Token: 'ACA' }, { Token: 'AUSD' }]
        },
        1_000_000_000_000
      )
    );
    await send(updateBalance, wallet.substrateAddress);

    await expect(incentivesPredeployed.depositDexShare(ADDRESS.LP_ACA_AUSD, 1_000_000_000_000))
      .to.emit(incentivesPredeployed, 'DepositedShare')
      .withArgs(await wallet.getAddress(), ADDRESS.LP_ACA_AUSD, 1_000_000_000_000);
  });

  it('incentives withdrawDexShare works', async () => {
    const updateBalance = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(
        wallet.substrateAddress,
        {
          DexShare: [{ Token: 'ACA' }, { Token: 'AUSD' }]
        },
        1_000_000_000_000
      )
    );
    await send(updateBalance, wallet.substrateAddress);

    await expect(incentivesPredeployed.depositDexShare(ADDRESS.LP_ACA_AUSD, 1_000_000_000_000))
      .to.emit(incentivesPredeployed, 'DepositedShare')
      .withArgs(await wallet.getAddress(), ADDRESS.LP_ACA_AUSD, 1_000_000_000_000);

    await expect(incentivesPredeployed.withdrawDexShare(ADDRESS.LP_ACA_AUSD, 1_000_000_000_000))
      .to.emit(incentivesPredeployed, 'WithdrewShare')
      .withArgs(await wallet.getAddress(), ADDRESS.LP_ACA_AUSD, 1_000_000_000_000);
  });

  it('incentives claimRewards works', async () => {
    const updateBalance = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(
        wallet.substrateAddress,
        {
          DexShare: [{ Token: 'ACA' }, { Token: 'AUSD' }]
        },
        1_000_000_000_000
      )
    );
    await send(updateBalance, wallet.substrateAddress);

    await expect(incentivesPredeployed.depositDexShare(ADDRESS.LP_ACA_AUSD, 1_000_000_000_000))
      .to.emit(incentivesPredeployed, 'DepositedShare')
      .withArgs(await wallet.getAddress(), ADDRESS.LP_ACA_AUSD, 1_000_000_000_000);

    await expect(incentivesPredeployed.claimRewards(1, ADDRESS.LP_ACA_AUSD))
      .to.emit(incentivesPredeployed, 'ClaimedRewards')
      .withArgs(await wallet.getAddress(), 1, ADDRESS.LP_ACA_AUSD);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
});
