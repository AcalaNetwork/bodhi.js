import { Signer, evmChai } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ethers } from 'ethers';
import Homa from '../build/Homa.json';
import ADDRESS from '@acala-network/contracts/utils/AcalaAddress';
import { getTestProvider } from '../../utils';

use(solidity);
use(evmChai);

const provider = getTestProvider();
const testPairs = createTestPairs();

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};

const send = async (extrinsic: any, sender: any) => {
  return new Promise(async (resolve) => {
    extrinsic.signAndSend(sender, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });
};

const dollar = BigNumber.from(formatAmount('1_000_000_000_000'));
const HomaABI = require('@acala-network/contracts/build/contracts/Homa.json').abi;

describe('homa', () => {
  let wallet: Signer;
  let walletTo: Signer;
  let homa: Contract;
  let homaPredeployed: Contract;

  before(async () => {
    [wallet, walletTo] = await provider.getWallets();
    homa = await deployContract(wallet as any, Homa);
    homaPredeployed = new ethers.Contract(ADDRESS.HOMA, HomaABI, wallet as any);
  });

  after(async () => {
    provider.api.disconnect();
  });

  it('homa works', async () => {
    expect((await homa.getExchangeRate()).toString()).to.equal('100000000000000000');

    // non-reset
    if ((await provider.api.query.homa.softBondedCapPerSubAccount()) === 0) {
      expect(await homa.getEstimatedRewardRate()).to.eq(0);

      expect(await homa.getCommissionRate()).to.eq(0);

      expect(await homa.getFastMatchFee()).to.eq(0);
    }
    const estimatedRewardRate = formatAmount('100_000_000_000_000_000'); // 10%
    const commissionRate = formatAmount('100_000_000_000_000_000'); // 10%
    const fastMatchFeeRate = formatAmount('100_000_000_000_000_000'); // 10%

    const updateHomaParams = provider.api.tx.sudo.sudo(
      provider.api.tx.homa.updateHomaParams(dollar.mul(1000), estimatedRewardRate, commissionRate, fastMatchFeeRate)
    );
    await send(updateHomaParams, await wallet.getSubstrateAddress());

    const updateStakingBalance = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(await wallet.getSubstrateAddress(), { Token: 'DOT' }, dollar.mul(1000))
    );
    await send(updateStakingBalance, await wallet.getSubstrateAddress());

    // trnasfer from homa contract, not support DOT
    await expect(homa.mint(dollar.mul(2))).to.be.revertedWith('BalanceTooLow');

    await expect(homaPredeployed.mint(dollar.mul(2)))
      .to.emit(homaPredeployed, 'Minted')
      .withArgs(await wallet.getAddress(), dollar.mul(2));

    expect(await homa.getEstimatedRewardRate()).to.eq(estimatedRewardRate);

    expect(await homa.getCommissionRate()).to.eq(commissionRate);

    expect(await homa.getFastMatchFee()).to.eq(fastMatchFeeRate);

    await expect(homaPredeployed.requestRedeem(dollar, false))
      .to.emit(homaPredeployed, 'RequestedRedeem')
      .withArgs(await wallet.getAddress(), dollar, false);

    await expect(homaPredeployed.requestRedeem(dollar, true))
      .to.emit(homaPredeployed, 'RequestedRedeem')
      .withArgs(await wallet.getAddress(), dollar, true);
  });
});
