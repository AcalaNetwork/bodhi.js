import { expect } from 'chai';
import { describe, it, beforeEach } from 'vitest';
import { FullReceipt } from '../utils';
import { BlockCache } from '../utils/BlockCache';

const randHash = (): string => Math.floor(Math.random() * 66666666).toString(16);

const randReceipt = (blockNumber: number): FullReceipt => ({
  blockNumber,
  transactionHash: randHash(),
}) as FullReceipt;

const mockBlock = (blockNumber: number): FullReceipt[] => Array.from({ length: Math.floor(Math.random() * 5) }, () => randReceipt(blockNumber));

const mockChain = (blocksCount: number = 50): FullReceipt[][] => Array.from({ length: blocksCount }, (_, idx) => mockBlock(idx));

describe('BlockCache', () => {
  const MAX_CACHED_BLOCK = 8;
  const TOTAL_BLOCKS = 30;
  const chain = mockChain(TOTAL_BLOCKS);
  const allTxs = chain.flat(999);
  let cache: BlockCache;

  beforeEach(() => {
    cache = new BlockCache(MAX_CACHED_BLOCK);
  });

  describe('initialization', () => {
    it('initialize two empty map', () => {
      expect(cache.blockNumToReceipts).to.deep.equal({});
      expect(cache.hashToReceipt).to.deep.equal({});
    });
  });

  describe('add block', () => {
    it('correctly find cached txs, and prune old blocks', () => {
      chain.forEach((txs, curBlockNumber) => {
        cache.addReceipts(curBlockNumber, txs);

        const firstBlockInCache = Math.max(0, curBlockNumber - MAX_CACHED_BLOCK + 1);
        expect(Object.values(cache.hashToReceipt).every(r => r.blockNumber >= firstBlockInCache));
        expect(Object.values(cache.blockNumToReceipts).flat().every(r => r.blockNumber >= firstBlockInCache));

        /* --------------- test getReceiptByHash --------------- */
        allTxs.forEach(tx => {
          const isBlockInCache = (
            tx.blockNumber >= firstBlockInCache &&
            tx.blockNumber <= curBlockNumber
          );

          const expectedReceipt = isBlockInCache ? tx : null;
          expect(cache.getReceiptByHash(tx.transactionHash)).to.deep.equal(expectedReceipt);
        });

        /* --------------- test getAllReceiptsAtBlock & getReceiptAtBlock --------------- */
        for (let blockNumber = 0; blockNumber < TOTAL_BLOCKS; blockNumber++) {
          const isBlockInCache = (
            blockNumber >= firstBlockInCache &&
            blockNumber <= curBlockNumber
          );

          const receiptsInCurBlock = isBlockInCache ? allTxs.filter(tx => tx.blockNumber === blockNumber) : [];
          const receiptNotInCurBlock = allTxs.filter(
            tx => !receiptsInCurBlock.map(r => r.transactionHash).includes(tx.transactionHash)
          );

          expect(cache.getAllReceiptsAtBlock(blockNumber)).to.deep.equal(receiptsInCurBlock);

          receiptsInCurBlock.forEach(r => {
            expect(cache.getReceiptAtBlock(blockNumber, r.transactionHash)).to.deep.equal(r);
          });

          receiptNotInCurBlock.forEach(r => {
            expect(cache.getReceiptAtBlock(blockNumber, r.transactionHash)).to.deep.equal(null);
          });
        }
      });
    });
  });
});
