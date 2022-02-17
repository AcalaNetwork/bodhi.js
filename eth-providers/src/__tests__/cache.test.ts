import { expect } from 'chai';
import { it } from 'mocha';
import { BlockCache } from '../utils/blockCache';

const randFakeHash = (): string => Math.floor(Math.random() * 66666666).toString(16);

const mockBlock = (): string[] => Array.from({ length: Math.floor(Math.random() * 5) }, () => randFakeHash());

const mockChain = (blocksCount: number = 50): string[][] => Array.from({ length: blocksCount }, () => mockBlock());

describe('BlockCache', () => {
  const EXTRA_BLOCK_COUNT = 15;
  const TOTAL_BLOCKS = 80;
  const cache = new BlockCache(EXTRA_BLOCK_COUNT);
  const chain = mockChain(TOTAL_BLOCKS);

  describe('initialization', () => {
    it('initialize two empty map', () => {
      expect(cache.blockTxHashes).to.deep.equal({});
      expect(cache.allTxHashes).to.deep.equal({});
    });
  });

  describe('add block', () => {
    it('correctly find cached transactions', () => {
      chain.forEach((transactions, idx) => {
        cache.addTxsAtBlock(idx, transactions);

        const { cachedBlocks } = cache._inspect();
        expect(Number(cachedBlocks[0])).to.equal(0);
        expect(Number(cachedBlocks[cachedBlocks.length - 1])).to.equal(idx);
      });

      for (let blockNumber = 0; blockNumber < TOTAL_BLOCKS; blockNumber++) {
        for (const curTx of chain[blockNumber]) {
          expect(cache.getBlockNumber(curTx)).to.equal(blockNumber);
        }
      }
    });
  });

  describe('update finalized block', () => {
    it('correctly remove tx from the (finalized - extra cached) block', () => {
      chain.forEach((transactions, idx) => cache.addTxsAtBlock(idx, transactions));

      for (let blockNumber = 0; blockNumber < TOTAL_BLOCKS; blockNumber++) {
        const blockToRemove = blockNumber - EXTRA_BLOCK_COUNT;
        if (blockToRemove < 0) continue;

        const curRemovingBlock = chain[blockToRemove];
        cache.handleFinalizedBlock(blockNumber);

        // these tx from finalized block should be removed
        for (const curTx of curRemovingBlock) {
          expect(cache.getBlockNumber(curTx)).to.equal(undefined);
        }

        // these tx from unfinalized block should still be there
        // ufbn => unfinalizeBlockNumber
        for (let ufbn = blockToRemove + 1; ufbn < TOTAL_BLOCKS; ufbn++) {
          for (const tx of chain[ufbn]) {
            expect(cache.getBlockNumber(tx)).to.equal(ufbn);
          }
        }

        const { cachedBlocks } = cache._inspect();
        expect(Number(cachedBlocks[0])).to.equal(blockNumber - EXTRA_BLOCK_COUNT + 1);
        expect(Number(cachedBlocks[cachedBlocks.length - 1])).to.equal(TOTAL_BLOCKS - 1);
      }
    });
  });
});
