import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvmRpcProvider } from '../rpc-provider';
import { nodeUrl } from './utils';
import { sleep } from '../utils';

const safeProvider = EvmRpcProvider.from(nodeUrl, { safeMode: true });
const provider = EvmRpcProvider.from(nodeUrl, { safeMode: false });

const newBlock = async (finalize: boolean): Promise<void> => {
  await provider.api.rpc.engine.createBlock(true /* create empty */, finalize);
  await sleep(300);
};

describe('safe mode', () => {
  beforeAll(async () => {
    await Promise.all([safeProvider.isReady(), provider.isReady()]);
  });

  afterAll(async () => {
    await sleep(5000);
    await safeProvider.disconnect();
    await provider.disconnect();
  });

  beforeEach(async () => await newBlock(true));

  it('isSafeMode', async () => {
    expect(provider.isSafeMode).to.equal(false);
    expect(safeProvider.isSafeMode).to.equal(true);
  });

  it('getBlockNumber', async () => {
    // make sure latest finalized block and latest block are even
    const [curBlock, curFinalizedBlock] = await Promise.all([provider.getBlockNumber(), safeProvider.getBlockNumber()]);
    expect(curBlock).to.equal(curFinalizedBlock);

    // real test
    await newBlock(false);
    expect(await provider.getBlockNumber()).to.equal(curBlock + 1);
    expect(await safeProvider.getBlockNumber()).to.equal(curBlock);
  });

  it('_getBlock', async () => {
    // make sure latest finalized block and latest block are even
    const [curBlock, curFinalizedBlock] = await Promise.all([
      provider.getBlockData('latest'),
      safeProvider.getBlockData('latest'),
    ]);
    expect(curBlock.hash).to.equal(curFinalizedBlock.hash);
    expect(curBlock.hash).to.equal(await safeProvider.finalizedBlockHash);

    // real test
    await newBlock(false);
    expect((await provider.getBlockData('latest')).number).to.equal(curBlock.number + 1);
    expect((await safeProvider.getBlockData('latest')).number).to.equal(curBlock.number);
  });

  it('_ensureSafeModeBlockTagFinalization', async () => {
    // make sure latest finalized block and latest block are even
    const [curBlock, curFinalizedBlock] = await Promise.all([
      provider.getBlockData('latest'),
      safeProvider.getBlockData('latest'),
    ]);
    expect(curBlock.hash).to.equal(curFinalizedBlock.hash);
    expect(curBlock.hash).to.equal(await safeProvider.finalizedBlockHash);

    // make sure next block is not finalized
    await newBlock(false);
    const [nextBlock, nextFinalizedBlock] = await Promise.all([
      provider.getBlockData('latest'),
      safeProvider.getBlockData('latest'),
    ]);
    expect(curBlock.hash).to.not.equal(nextBlock.hash);
    expect(curFinalizedBlock.hash).to.equal(nextFinalizedBlock.hash);
    expect(curFinalizedBlock.hash).to.equal(curBlock.hash);

    // in normal mode this should do nothing and just return the same tag
    expect(await provider._ensureSafeModeBlockTagFinalization(undefined)).to.equal(undefined);
    expect(await provider._ensureSafeModeBlockTagFinalization('latest')).to.equal('latest');
    expect(await provider._ensureSafeModeBlockTagFinalization('0x1234567')).to.equal('0x1234567');
    expect(await provider._ensureSafeModeBlockTagFinalization(123)).to.equal(123);
    expect(await provider._ensureSafeModeBlockTagFinalization('whatever')).to.equal('whatever');

    /* --------------------------
        in safe mode:
        - ① "latest" should point to latest finalized block
        - ② finalized block / no tag should do nothing and return the same tag
        - ③ unfinalized block should throw error
                                                      -------------------------- */
    // ①
    expect(await safeProvider._ensureSafeModeBlockTagFinalization('latest')).to.equal(
      await safeProvider.finalizedBlockHash
    );
    expect(await safeProvider._ensureSafeModeBlockTagFinalization('latest')).to.equal(curFinalizedBlock.hash);

    // ②
    expect(await safeProvider._ensureSafeModeBlockTagFinalization(undefined)).to.equal(undefined);
    expect(await safeProvider._ensureSafeModeBlockTagFinalization(curFinalizedBlock.hash)).to.equal(
      curFinalizedBlock.hash
    );

    for (let i = 1; i < curFinalizedBlock.number; i++) {
      const hash = await provider._getBlockHash(i);
      expect(await safeProvider._ensureSafeModeBlockTagFinalization(i)).to.equal(i);
      expect(await safeProvider._ensureSafeModeBlockTagFinalization(hash)).to.equal(hash);
    }

    // ③
    await expect(safeProvider._ensureSafeModeBlockTagFinalization(nextBlock.hash)).rejects.toThrowError(
      'SAFE MODE ERROR: target block is not finalized'
    );
  });

  it('subscribe', async () => {
    // setup

    const mock = { cb: vi.fn(), safeCb: vi.fn() };
    const spyCb = vi.spyOn(mock, 'cb');
    const spySafeCb = vi.spyOn(mock, 'safeCb');

    const sub = provider.addEventListener('newHeads', mock.cb, {});
    const safeSub = safeProvider.addEventListener('newHeads', mock.safeCb, {});

    // new finalized block
    await newBlock(true);
    let curHash = (await provider.getBlockData('latest')).hash;

    expect(spyCb).toHaveBeenCalledWith({
      subscription: sub,
      result: expect.objectContaining({
        hash: curHash,
      }),
    });

    expect(spySafeCb).toHaveBeenCalledWith({
      subscription: safeSub,
      result: expect.objectContaining({
        hash: curHash,
      }),
    });

    // new unfinalized block
    await newBlock(false);
    curHash = (await provider.getBlockData('latest')).hash;

    expect(spyCb).toHaveBeenCalledWith({
      subscription: sub,
      result: expect.objectContaining({
        hash: curHash,
      }),
    });

    expect(spySafeCb).not.toHaveBeenCalledWith({
      subscription: safeSub,
      result: expect.objectContaining({
        hash: curHash,
      }),
    });
  });
});
