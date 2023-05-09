import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { EvmRpcProvider } from '../../rpc-provider';
import { Wallet } from '@ethersproject/wallet';
import { afterAll, describe, expect, it } from 'vitest';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { sendTx, sleep } from '../../utils';
import ACAABI from '@acala-network/contracts/build/contracts/Token.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import evmAccounts from '../evmAccounts';

describe('TransactionReceipt', async () => {
  const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';
  const provider = EvmRpcProvider.from(endpoint);
  await provider.isReady();

  afterAll(async () => {
    await sleep(5000);
    await provider.disconnect();
    await sleep(1000);
  });

  it('getTransactionReceipt', async () => {
    const account1 = evmAccounts[0];
    const account2 = evmAccounts[1];

    const account1Wallet = new Wallet(account1.privateKey).connect(provider as any);
    const acaContract = new Contract(ADDRESS.ACA, ACAABI.abi, account1Wallet);

    const pairs = createTestPairs();
    const oneAca = 10n ** BigInt(provider.api.registry.chainDecimals[0]);
    const Alice = pairs.alice;

    /** transfer aca */
    console.log('transfer aca');
    const extrinsic = provider.api.tx.balances.transfer(account1.defaultSubstrateAddress, 100n * oneAca);
    await extrinsic.signAsync(Alice);
    await sendTx(provider.api, extrinsic);

    const result = await acaContract.functions.transfer(account2.evmAddress, 10n * oneAca, {
      gasLimit: BigNumber.from(34132001n),
      gasPrice: BigNumber.from(200786445289n),
      type: 0,
    });

    const receipt = await provider.getReceiptAtBlock(result.hash, result.blockHash);
    expect(receipt).toBeTruthy();
    expect(receipt!.blockHash).equal(result.blockHash);
    expect(receipt!.logs.length).equal(1);
    expect(receipt!.logs[0].blockNumber).equal(result.blockNumber);
    expect(receipt!.logs[0].topics.length).equal(3);
  });
});
