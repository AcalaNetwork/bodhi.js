import { Signer, evmChai, getTestUtils, SignerProvider } from '@acala-network/bodhi';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { BigNumber, Contract, ethers } from 'ethers';
import Homa from '../build/Homa.json';
import ADDRESS from '@acala-network/contracts/utils/AcalaAddress';
import { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types';

use(solidity);
use(evmChai);

const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};

const send = async (extrinsic: SubmittableExtrinsic<'promise'>, sender: AddressOrPair) =>
  new Promise((resolve) => {
    extrinsic.signAndSend(sender, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });

const dollar = BigNumber.from(formatAmount('1_000_000_000_000'));
const HomaABI = require('@acala-network/contracts/build/contracts/Homa.json').abi;

describe('homa', () => {
  let wallet: Signer;
  let provider: SignerProvider;
  let homa: Contract;
  let homaPredeployed: Contract;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    const testUtils = await getTestUtils(endpoint);
    wallet = testUtils.wallets[0];
    provider = testUtils.provider; // this is the same as wallet.provider
    homa = await deployContract(wallet, Homa);
    homaPredeployed = new ethers.Contract(ADDRESS.HOMA, HomaABI, wallet);
  });

  after(async () => {
    wallet.provider.api.disconnect();
  });

  it('homa works', async () => {
    expect((await homa.getExchangeRate()).toString()).to.equal('100000000000000000');

    // non-reset
    if ((await provider.api.query.homa.softBondedCapPerSubAccount()).toNumber() === 0) {
      expect(await homa.getEstimatedRewardRate()).to.eq(0);

      expect(await homa.getCommissionRate()).to.eq(0);

      expect(await homa.getFastMatchFee()).to.eq(0);
    }
    const estimatedRewardRate = formatAmount('100_000_000_000_000_000'); // 10%
    const commissionRate = formatAmount('100_000_000_000_000_000'); // 10%
    const fastMatchFeeRate = formatAmount('100_000_000_000_000_000'); // 10%

    const updateHomaParams = provider.api.tx.sudo.sudo(
      provider.api.tx.homa.updateHomaParams(
        dollar.mul(1000).toString(),
        estimatedRewardRate,
        commissionRate,
        fastMatchFeeRate
      )
    );
    await send(updateHomaParams, wallet.substrateAddress);

    const updateStakingBalance = provider.api.tx.sudo.sudo(
      provider.api.tx.currencies.updateBalance(wallet.substrateAddress, { Token: 'DOT' }, dollar.mul(1000).toBigInt())
    );
    await send(updateStakingBalance, wallet.substrateAddress);

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
