import ACAABI from '@acala-network/contracts/build/contracts/Token.json';
import ADDRESS from '@acala-network/contracts/utils/Address';
import type { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import type { KeyringPair } from '@polkadot/keyring/types';
import { expect } from 'chai';
import { EvmRpcProvider } from '../../rpc-provider';
import { sendTx } from '../../utils';
import { computeDefaultSubstrateAddress } from '../../utils/address';
import evmAccounts from '../evmAccounts';

const endpoint = 'ws://127.0.0.1:9944';
const account1 = evmAccounts[0];

const provider = EvmRpcProvider.from(endpoint);

const account1Wallet = Wallet.fromMnemonic(account1.mnemonic).connect(provider as any);

const acaContract = new Contract(ADDRESS.ACA, ACAABI.abi, account1Wallet);

describe('transaction test', () => {
  let Alice: KeyringPair;
  let oneAca: bigint;

  before(async () => {
    await provider.isReady();
    const pairs = createTestPairs();
    oneAca = 10n ** BigInt(provider.api.registry.chainDecimals[0]);
    Alice = pairs.alice;
  });

  after(async () => {
    await provider.disconnect();
  });

  it('get account1 substrateAddress', () => {
    expect(computeDefaultSubstrateAddress(account1.evmAddress)).to.equal(account1.defaultSubstrateAddress);
  });

  // FIXME: this one fails
  it('recieve aca', async () => {
    const queryBalance = () => acaContract.balanceOf(account1.evmAddress);

    const balance1: BigNumber = await queryBalance();
    const amount = 100n * oneAca;
    const extrinsic = provider.api.tx.balances.transfer(account1.defaultSubstrateAddress, amount);
    await extrinsic.signAsync(Alice);
    await sendTx(provider.api, extrinsic);
    const balance2: BigNumber = await queryBalance();

    expect(balance2.sub(balance1).toBigInt()).equal(amount);
  });
});
