import dotenv from 'dotenv';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { EvmRpcProvider } from '../../rpc-provider';

dotenv.config();

const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

describe('connect random', () => {
  it('should throw error', async () => {
    try {
      const provider = EvmRpcProvider.from('ws://192.-');
      await provider.isReady();
    } catch (e) {
      expect((e as any).type).to.equal('error');
    }
  });
});

describe('connect chain', () => {
  it('works', async () => {
    const provider = EvmRpcProvider.from(endpoint);
    await provider.isReady();
    expect(provider.isConnected).to.be.true;
    await provider.disconnect();
  });
});

describe('getReceiptAtBlock', () => {
  const ACALA_NODE_URL = 'wss://acala-rpc-0.aca-api.network';
  const ACALA_SUBQL = 'https://subql-query-acala.aca-api.network';
  const provider = EvmRpcProvider.from(ACALA_NODE_URL, { subqlUrl: ACALA_SUBQL });

  const blockHash = '0xf9655bfef23bf7dad14a037aa39758daccfd8dc99a7ce69525f81548068a5946';
  // const txHash1 = '0xbb6644b3053d5213f544dc54efb4de0e81b6a88e863aa0cc22d14928b3601725';  // new
  // const txHash2 = '0x240a9ec2efdacae2a89486980874b23987b9801fd1ca7a424506629b71a53fa6';  // new
  const txHash1 = '0x21683466c991960a70c396f90f847a11337bfe52f3069020909de7f937aa0380';
  const txHash2 = '0x240a9ec2efdacae2a89486980874b23987b9801fd1ca7a424506629b71a53fa6';

  let receipt1;
  let receipt2;

  beforeAll(async () => await provider.isReady());
  afterAll(async () => await provider.disconnect());

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

  // TODO: current subql uses old hash, enable me after reindexing with latest subql
  it.skip('getReceiptAtBlockFromChain should find same txs from chain', async () => {
    const res1 = await provider.getReceiptAtBlockFromChain(txHash1, blockHash);
    const res2 = await provider.getReceiptAtBlockFromChain(txHash2, blockHash);

    expect(res1).to.deep.equal(receipt1);
    expect(res2).to.deep.equal(receipt2);
  })
});
