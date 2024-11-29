import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import { EvmRpcProvider } from '../rpc-provider';
import { sleep } from '../utils';

dotenv.config();

const ACALA_NODE_URL = 'wss://acala-rpc.dwellir.com';
const ACALA_SUBQL = 'https://subql-query-acala.aca-api.network';
const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

describe('connect random', () => {
  it('should throw error', async () => {
    const provider = EvmRpcProvider.from('ws://192.-');
    await expect(provider.isReady()).rejects.toThrowError();
  });
});

describe('getReceiptAtBlock', async () => {
  const provider = EvmRpcProvider.from(ACALA_NODE_URL, { subqlUrl: ACALA_SUBQL });
  await provider.isReady();

  const blockHash = '0xf9655bfef23bf7dad14a037aa39758daccfd8dc99a7ce69525f81548068a5946';
  const txHash1 = '0xbb6644b3053d5213f544dc54efb4de0e81b6a88e863aa0cc22d14928b3601725';
  const txHash2 = '0x240a9ec2efdacae2a89486980874b23987b9801fd1ca7a424506629b71a53fa6';

  let receipt1;
  let receipt2;

  afterAll(async () => {
    await sleep(5000);
    await provider.disconnect();
  });

  it('should find tx using tx hash or index from subql', async () => {
    receipt1 = await provider.getReceiptAtBlock(txHash1, blockHash);
    receipt2 = await provider.getReceiptAtBlock(txHash2, blockHash);

    expect(receipt1?.transactionIndex).to.equal(0);
    expect(receipt2?.transactionIndex).to.equal(1);

    const resIdx1 = await provider.getReceiptAtBlock(receipt1?.transactionIndex!, blockHash);
    const resIdx2 = await provider.getReceiptAtBlock(receipt2?.transactionIndex!, blockHash);

    expect(resIdx1).to.deep.equal(receipt1);
    expect(resIdx2).to.deep.equal(receipt2);
  });

  it('getReceiptAtBlockFromChain should find same txs from chain', async () => {
    const res1 = await provider.getReceiptAtBlockFromChain(txHash1, blockHash);
    const res2 = await provider.getReceiptAtBlockFromChain(txHash2, blockHash);

    expect(res1).to.deep.equal(receipt1);
    expect(res2).to.deep.equal(receipt2);
  });
});

describe.concurrent('rpc test', async () => {
  const provider = EvmRpcProvider.from(endpoint);

  beforeAll(async () => {
    await provider.isReady();
  });

  afterAll(async () => {
    await provider.disconnect();
  });

  it('chainId', async () => {
    const result = await provider.chainId();
    expect(result).to.equal(787);
  });

  it('getTransactionCount', async () => {
    const result = await provider.getTransactionCount('0x33f9440ff970496a09e391f3773a66f1e98eb13c', 'latest');
    expect(result).not.toBeUndefined();
  });

  it('getCode', async () => {
    const noCode = await provider.getCode('0x1110000000000000000000000000000000000802');
    expect(noCode).to.equal('0x');

    const dexCode = await provider.getCode('0x0000000000000000000000000000000000000803');
    expect(dexCode.length > 2).to.be.true;
  });

  it('call', async () => {
    const result = await provider.call({
      data: '0x70a0823100000000000000000000000033f9440ff970496a09e391f3773a66f1e98eb13c',
      from: '0x33f9440ff970496a09e391f3773a66f1e98eb13c',
      to: '0xbffb25b73c6a0581a28988ce34c9f240d525b152',
    });

    expect(result).not.toBeUndefined();
  });

  it('getBalance', async () => {
    const result = await provider.getBalance('0x33f9440ff970496a09e391f3773a66f1e98eb13c');

    expect(result.toString()).to.equal('0');
  });

  it('getBlockByNumber', async () => {
    await expect(
      provider._getBlockHeader('0xff2d5d74f16df09b810225ffd9e1442250914ae6de9459477118d675713c732c')
    ).rejects.toThrow('not found');
  });
});
