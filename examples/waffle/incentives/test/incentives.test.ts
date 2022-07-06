import { Signer, evmChai } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ethers } from 'ethers';
import Incentives from '../build/Incentives.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { getTestProvider } from '../../utils';

use(solidity);
use(evmChai);

const provider = getTestProvider();
const testPairs = createTestPairs();
const IncentivesABI = require('@acala-network/contracts/build/contracts/Incentives.json').abi;

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};

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

describe('incentives', () => {
  let wallet: Signer;
  let walletTo: Signer;
  let incentives: Contract;
  let incentivesPredeployed: Contract;

  before(async () => {
    [wallet, walletTo] = await provider.getWallets();
    incentives = await deployContract(wallet as any, Incentives);
    incentivesPredeployed = new ethers.Contract(ADDRESS.Incentives, IncentivesABI, wallet as any);
  });

  after(async () => {
    provider.api.disconnect();
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
    await send(updateIncentiveRewards, await wallet.getSubstrateAddress());

    expect(await incentives.getIncentiveRewardAmount(0, ADDRESS.DOT, ADDRESS.DOT)).to.equal(100);
    expect(await incentives.getIncentiveRewardAmount(1, ADDRESS.DOT, ADDRESS.DOT)).to.equal(0);
    // TODO: enum doesn't match
    // expect(await incentives.getIncentiveRewardAmount(2, ADDRESS.DOT, ADDRESS.DOT)).to.be.reverted;
  });

  it('incentives getDexRewardRate works', async () => {
    const Rate = FixedU128.div(BigNumber.from('10')); // 1/10
    const updateDexSavingRewards = provider.api.tx.sudo.sudo(
      provider.api.tx.incentives.updateDexSavingRewards([
        [
          {
            Dex: {
              DexShare: [{ Token: 'ACA' }, { Token: 'AUSD' }]
            }
          },
          Rate
        ]
      ])
    );
    await send(updateDexSavingRewards, await wallet.getSubstrateAddress());

    expect(await incentives.getDexRewardRate(ADDRESS.LP_ACA_AUSD)).to.equal(Rate);
  });

  it('incentives getClaimRewardDeductionRate works', async () => {
    const Rate = FixedU128.div(BigNumber.from('10')); // 1/10
    const updateClaimRewardDeductionRates = provider.api.tx.sudo.sudo(
      provider.api.tx.incentives.updateClaimRewardDeductionRates([
        [
          {
            Dex: {
              DexShare: [{ Token: 'ACA' }, { Token: 'AUSD' }]
            }
          },
          Rate
        ]
      ])
    );
    await send(updateClaimRewardDeductionRates, await wallet.getSubstrateAddress());

    expect(await incentives.getClaimRewardDeductionRate(1, ADDRESS.LP_ACA_AUSD)).to.equal(Rate);
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
          Rate
        ]
      ])
    );
    await send(updateClaimRewardDeductionRates, await wallet.getSubstrateAddress());

    expect(
      (
        await incentives.getPendingRewards([ADDRESS.ACA, ADDRESS.AUSD], 0, ADDRESS.ACA, await wallet.getAddress())
      ).toString()
    ).to.equal('0,0');
  });

  it('incentives depositDexShare works', async () => {
    const updateBalance = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(
        { id: await wallet.getSubstrateAddress() },
        {
          DexShare: [{ Token: 'ACA' }, { Token: 'AUSD' }]
        },
        1_000_000_000
      )
    );
    await send(updateBalance, await wallet.getSubstrateAddress());

    await expect(incentivesPredeployed.depositDexShare(ADDRESS.LP_ACA_AUSD, 1000))
      .to.emit(incentivesPredeployed, 'DepositedShare')
      .withArgs(await wallet.getAddress(), ADDRESS.LP_ACA_AUSD, 1000);
  });

  it('incentives withdrawDexShare works', async () => {
    const updateBalance = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(
        { id: await wallet.getSubstrateAddress() },
        {
          DexShare: [{ Token: 'ACA' }, { Token: 'AUSD' }]
        },
        1_000_000_000
      )
    );
    await send(updateBalance, await wallet.getSubstrateAddress());

    await expect(incentivesPredeployed.depositDexShare(ADDRESS.LP_ACA_AUSD, 1000))
      .to.emit(incentivesPredeployed, 'DepositedShare')
      .withArgs(await wallet.getAddress(), ADDRESS.LP_ACA_AUSD, 1000);

    await expect(incentivesPredeployed.withdrawDexShare(ADDRESS.LP_ACA_AUSD, 1000))
      .to.emit(incentivesPredeployed, 'WithdrewShare')
      .withArgs(await wallet.getAddress(), ADDRESS.LP_ACA_AUSD, 1000);
  });

  it('incentives claimRewards works', async () => {
    const updateBalance = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(
        { id: await wallet.getSubstrateAddress() },
        {
          DexShare: [{ Token: 'ACA' }, { Token: 'AUSD' }]
        },
        1_000_000_000
      )
    );
    await send(updateBalance, await wallet.getSubstrateAddress());

    await expect(incentivesPredeployed.depositDexShare(ADDRESS.LP_ACA_AUSD, 1000))
      .to.emit(incentivesPredeployed, 'DepositedShare')
      .withArgs(await wallet.getAddress(), ADDRESS.LP_ACA_AUSD, 1000);

    await expect(incentivesPredeployed.claimRewards(1, ADDRESS.LP_ACA_AUSD))
      .to.emit(incentivesPredeployed, 'ClaimedRewards')
      .withArgs(await wallet.getAddress(), 1, ADDRESS.LP_ACA_AUSD);
  });
});
