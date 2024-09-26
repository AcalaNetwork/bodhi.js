import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { afterAll, describe, expect, it } from 'vitest';
import ACAABI from '@acala-network/contracts/build/contracts/Token.json';
import ADDRESS from '@acala-network/contracts/utils/AcalaAddress';

import { EvmRpcProvider } from '../rpc-provider';
import { parseUnits } from 'ethers/lib/utils';
import evmAccounts from './utils/evmAccounts';

describe('TransactionReceipt', async () => {
  const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';
  const provider = EvmRpcProvider.from(endpoint);
  await provider.isReady();

  afterAll(async () => {
    await provider.disconnect();
  });

  it('getReceiptAtBlock', async () => {
    const wallet1 = new Wallet(evmAccounts[0].privateKey).connect(provider);
    const addr1 = wallet1.address;
    console.log({ addr1 });
    const acaContract = new Contract(ADDRESS.ACA, ACAABI.abi, wallet1);

    const tx = await acaContract.transfer(evmAccounts[1].evmAddress, parseUnits('10', 12));
    await tx.wait();

    const receipt = await provider.getReceiptAtBlock(tx.hash, tx.blockHash);
    expect(receipt).toBeTruthy();
    expect(receipt!.blockHash).equal(tx.blockHash);
    expect(receipt!.logs.length).equal(1);
    expect(receipt!.logs[0].blockNumber).equal(tx.blockNumber);
    expect(receipt!.logs[0].topics.length).equal(3);
  });
});
