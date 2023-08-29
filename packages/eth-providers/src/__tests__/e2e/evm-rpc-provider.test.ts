import { EvmRpcProvider } from '../../rpc-provider';
import { afterAll, describe, expect, it } from 'vitest';
import { runWithTiming, sleep } from '../../utils';
import dotenv from 'dotenv';

dotenv.config();

const ACALA_NODE_URL = 'wss://acala-rpc.aca-api.network';
const ACALA_SUBQL = 'https://subql-query-acala.aca-api.network';

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

    delete res2?.['exitReason']; // full receipt contains exitReason
    expect(res1).to.deep.equal(receipt1);
    expect(res2).to.deep.equal(receipt2);
  });
});

// TODO: maybe setup a subway to test
describe.skip('all cache', async () => {
  const provider = EvmRpcProvider.from(ACALA_NODE_URL);
  await provider.isReady();

  afterAll(async () => await provider.disconnect());

  it('getBlockHeader at latest block => header cache', async () => {
    const { time: time1, res: header1 } = await runWithTiming(() => provider._getBlockHeader('latest'), 1);
    const { time: time2, res: header2 } = await runWithTiming(() => provider._getBlockHeader('latest'), 1);

    // latest header should already be cached at the start
    console.log('latest header:', { time1, time2 });
    expect(time1).to.be.lt(10);
    expect(time2).to.be.lt(10);
    expect(header1.toJSON()).to.deep.equal(header2.toJSON());
  });

  it('getBlockHeader at random block => header cache', async () => {
    const { time: time1, res: header1 } = await runWithTiming(() => provider._getBlockHeader(1234567), 1);
    const { time: time2, res: header2 } = await runWithTiming(() => provider._getBlockHeader(1234567), 1);

    // second time should be 100x faster with cache, in poor network 800ms => 0.5ms
    console.log('getBlockHeader:', { time1, time2 });
    expect(time2).to.be.lt(time1 / 20); // conservative multiplier
    expect(time2).to.be.lt(10); // no async call
    expect(header1.toJSON()).to.deep.equal(header2.toJSON());
  });

  it('getBlockData at random block => header cache + storage cache + receipt cache', async () => {
    const { time: time1, res: blockData1 } = await runWithTiming(() => provider.getBlockData(1234321), 1);
    const { time: time2, res: blockData2 } = await runWithTiming(() => provider.getBlockData(1234321), 1);

    // second time should be 100x faster with cache, usually 1500ms => 3ms
    console.log('getBlockData: ', { time1, time2 });
    expect(time2).to.be.lt(time1 / 20); // conservative multiplier
    expect(time2).to.be.lt(30); // no async call
    expect(blockData1).to.deep.equal(blockData2);
  });
});
