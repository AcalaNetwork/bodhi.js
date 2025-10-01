import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import dotenv from 'dotenv';

import { EvmRpcProvider } from '../rpc-provider';
import { apiCache } from '../utils/ApiAtCache';
import { runWithTiming } from '../utils';

dotenv.config();

const ACALA_NODE_URL = 'wss://acala-rpc.aca-api.network';

describe.concurrent('provider cache', async () => {
  let provider: EvmRpcProvider;
  let provider2: EvmRpcProvider;

  beforeAll(async () => {
    provider = EvmRpcProvider.from(ACALA_NODE_URL);
    provider2 = EvmRpcProvider.from(ACALA_NODE_URL);    // provider 2 to query some info without affecting cache
    await provider.isReady();
    await provider2.isReady();
  });

  afterAll(async () => await Promise.all([
    provider.disconnect(),
    provider2.disconnect(),
  ]));

  it('get apiAt', async() => {
    const curBlock = await provider.getBlockNumber();
    const randomBlock = curBlock - Math.floor(Math.random() * 100000);
    const blockHash = await provider2._getBlockHash(randomBlock);

    const { time: time1, res: apiAt1 } = await runWithTiming(() => apiCache.getApiAt(provider.api, blockHash), 1);
    const { time: time2, res: apiAt2 } = await runWithTiming(() => apiCache.getApiAt(provider.api, blockHash), 1);

    expect(time1).to.be.gt(0, 'first get apiAt failed!');
    expect(time2).to.be.gt(0, 'second get apiAt failed!');
    console.log('get random apiAt:', { time1, time2 });

    expect(time2).to.be.lt(time1 / 20);   // conservative multiplier
    expect(time2).to.be.lt(50);           // no async call so should be almost instant
    expect(apiAt1).to.equal(apiAt2);      // should be the same instance
  });

  it('get block hash', async() => {
    const curBlock = await provider.getBlockNumber();
    const randomBlock = curBlock - Math.floor(Math.random() * 100000);

    const { time: time1, res: hash1 } = await runWithTiming(() => provider._getBlockHash(randomBlock), 1);
    const { time: time2, res: hash2 } = await runWithTiming(() => provider._getBlockHash(randomBlock), 1);

    expect(time1).to.be.gt(0, 'first get block hash failed!');
    expect(time2).to.be.gt(0, 'second get block hash failed!');
    console.log('get random block hash:', { time1, time2 });

    expect(time2).to.be.lt(time1 / 20);   // conservative multiplier
    expect(time2).to.be.lt(50);           // no async call so should be almost instant
    expect(hash1).to.deep.equal(hash2);
  });

  it('get block', async() => {
    const curBlock = await provider.getBlockNumber();
    const randomBlock = curBlock - Math.floor(Math.random() * 100000);
    const blockHash = await provider2._getBlockHash(randomBlock);

    const { time: time1, res: blockNumber1 } = await runWithTiming(() => provider._getBlockNumber(blockHash), 1);
    const { time: time2, res: blockNumber2 } = await runWithTiming(() => provider._getBlockNumber(blockHash), 1);

    expect(time1).to.be.gt(0, 'first get block number failed!');
    expect(time2).to.be.gt(0, 'second get block number failed!');
    console.log('get random block number:', { time1, time2 });

    expect(time2).to.be.lt(time1 / 20);   // conservative multiplier
    expect(time2).to.be.lt(50);           // no async call so should be almost instant
    expect(blockNumber1).to.deep.equal(blockNumber2);
  });

  it('get block header', async() => {
    const curBlock = await provider.getBlockNumber();
    const randomBlock = curBlock - Math.floor(Math.random() * 100000);

    const { time: time1, res: header1 } = await runWithTiming(() => provider._getBlockHeader(randomBlock), 1);
    const { time: time2, res: header2 } = await runWithTiming(() => provider._getBlockHeader(randomBlock), 1);

    expect(time1).to.be.gt(0, 'first get header failed!');
    expect(time2).to.be.gt(0, 'second get header failed!');
    console.log('get random header:', { time1, time2 });

    expect(time2).to.be.lt(time1 / 20);   // conservative multiplier
    expect(time2).to.be.lt(50);           // no async call so should be almost instant
    expect(header1.toJSON()).to.deep.equal(header2.toJSON());
  });

  it('get block data', async () => {
    const curBlock = await provider.getBlockNumber();
    const randomBlock = curBlock - Math.floor(Math.random() * 100000);

    const { time: time1, res: blockData1 } = await runWithTiming(() => provider.getBlockData(randomBlock), 1);
    const { time: time2, res: blockData2 } = await runWithTiming(() => provider.getBlockData(randomBlock), 1);
    const { time: time3, res: blockData3 } = await runWithTiming(() => provider.getBlockData(randomBlock, true), 1);

    expect(time1).to.be.gt(0, 'first get blockData failed!');
    expect(time2).to.be.gt(0, 'second get blockData failed!');
    expect(time3).to.be.gt(0, 'third get blockData failed!');
    console.log('get random blockData:', { time1, time2, time3 });

    expect(time2).to.be.lt(time1 / 20);   // conservative multiplier
    expect(time2).to.be.lt(50);           // no async call so should be almost instant
    expect(time3).to.be.lt(time1 / 20);   // conservative multiplier
    expect(time3).to.be.lt(50);           // no async call so should be almost instant
    expect(blockData1).to.deep.equal(blockData2);
    expect(blockData3.hash).to.deep.equal(blockData2.hash);
  });
});

