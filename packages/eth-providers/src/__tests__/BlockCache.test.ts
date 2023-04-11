import { BlockCache } from '../utils/BlockCache';
import { FullReceipt } from '../utils';
import { describe, expect, it } from 'vitest';
import { mockChain } from './testUtils';

const sortReceipt = (r1: FullReceipt, r2: FullReceipt) => {
  if (r1.blockNumber !== r2.blockNumber) {
    return r1.blockNumber - r2.blockNumber;
  } else if (r1.blockHash !== r2.blockHash) {
    return r1.blockHash.localeCompare(r2.blockHash);
  } else {
    return r1.transactionHash.localeCompare(r2.transactionHash);
  }
};

describe('BlockCache', () => {
  const MAX_CACHED_BLOCK = 8;
  const blocks = 30;
  const chain = mockChain(blocks);
  const TOTAL_BLOCKS = chain.length;
  const allReceipts = chain.map((block) => block.receipts).flat(999);
  const allBlockHashes = chain.map((block) => block.blockHash);
  const cache = new BlockCache(MAX_CACHED_BLOCK);

  describe('add block', () => {
    it('correctly find cached txs, and prune old blocks', () => {
      chain.forEach(({ blockHash, receipts }, lastCacheBlockIdx) => {
        cache.addReceipts(blockHash, receipts);

        const firstCacheBlockIdx = Math.max(0, lastCacheBlockIdx - MAX_CACHED_BLOCK + 1);
        const allExpectedReceiptsInCache = chain
          .slice(firstCacheBlockIdx, lastCacheBlockIdx + 1)
          .map((block) => block.receipts)
          .flat()
          .sort(sortReceipt);

        expect(Object.values(cache.txHashToReceipt).sort(sortReceipt)).to.deep.equal(allExpectedReceiptsInCache);
        expect(Object.values(cache.blockHashToReceipts).flat().sort(sortReceipt)).to.deep.equal(
          allExpectedReceiptsInCache
        );

        /* --------------- test getReceiptByHash & getReceiptAtBlock --------------- */
        allReceipts.forEach((receipt) => {
          const isReceiptInCache = allExpectedReceiptsInCache.find(
            (r) => r.transactionHash === receipt.transactionHash
          );
          const expectedReceipt = isReceiptInCache ? receipt : null;
          expect(cache.getReceiptByHash(receipt.transactionHash)).to.deep.equal(expectedReceipt);

          allBlockHashes.forEach((blockHash) => {
            const isCorrectBlockHash = blockHash === receipt.blockHash;
            const expectedReceipt = isReceiptInCache && isCorrectBlockHash ? receipt : null;
            expect(cache.getReceiptAtBlock(receipt.transactionHash, blockHash)).to.deep.equal(expectedReceipt);
          });
        });

        // /* --------------- test getAllReceiptsAtBlock --------------- */
        for (let blockIdx = 0; blockIdx < TOTAL_BLOCKS; blockIdx++) {
          const isBlockInCache = blockIdx >= firstCacheBlockIdx && blockIdx <= lastCacheBlockIdx;

          const expectedReceiptsInCurBlock = isBlockInCache ? chain[blockIdx].receipts : [];
          expect(cache.getAllReceiptsAtBlock(chain[blockIdx].blockHash)).to.deep.equal(expectedReceiptsInCurBlock);
        }
      });
    });
  });
});
