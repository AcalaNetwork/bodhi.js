import { expect } from 'chai';
import { describe, it, beforeEach } from 'vitest';
import { BlockCache } from '../utils/BlockCache';

const randFakeHash = (): string => Math.floor(Math.random() * 66666666).toString(16);

const mockBlock = (): string[] => Array.from({ length: Math.floor(Math.random() * 5) }, () => randFakeHash());

const mockChain = (blocksCount: number = 50): string[][] => Array.from({ length: blocksCount }, () => mockBlock());

describe('BlockCache', () => {
  const EXTRA_BLOCK_COUNT = 15;
  const TOTAL_BLOCKS = 80;
  const chain = mockChain(TOTAL_BLOCKS);
  let cache: BlockCache;

  beforeEach(() => {
    cache = new BlockCache(EXTRA_BLOCK_COUNT);
  });

  describe('initialization', () => {
    it('initialize two empty map', () => {
      expect(cache.blockToHashes).to.deep.equal({});
      expect(cache.hashToBlocks).to.deep.equal({});
    });
  });

  describe('add block', () => {
    it('correctly find cached transactions, and prune old blocks', () => {
      chain.forEach((transactions, latestBlockNumber) => {
        cache.addTxsAtBlock(latestBlockNumber, transactions);

        const firstBlockInCache = Math.max(0, latestBlockNumber - EXTRA_BLOCK_COUNT + 1);
        /* ---------- test inspect ---------- */
        const { cachedBlocks } = cache._inspect();
        expect(parseInt(cachedBlocks[0])).to.equal(firstBlockInCache);
        expect(parseInt(cachedBlocks[cachedBlocks.length - 1])).to.equal(latestBlockNumber);

        /* ---------- test getBlockNumber ---------- */
        for (let blockNumber = 0; blockNumber < TOTAL_BLOCKS; blockNumber++) {
          const isBlockInCache = blockNumber >= firstBlockInCache && blockNumber <= latestBlockNumber;

          for (const curTx of chain[blockNumber]) {
            expect(cache.getBlockNumber(curTx)).to.equal(isBlockInCache ? blockNumber : undefined);
          }
        }
      });
    });
  });
});
