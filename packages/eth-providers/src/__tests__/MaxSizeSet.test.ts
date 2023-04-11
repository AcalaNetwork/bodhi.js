import { MaxSizeSet } from '../utils/MaxSizeSet';
import { describe, it } from 'vitest';
import { expect } from 'chai';
import { mockChain } from './testUtils';

describe('MaxSizeSet', () => {
  const MAX_CACHED_BLOCK = 5;
  const blocks = 20;
  const chain = mockChain(blocks, false);
  const allBlockHashes = chain.map((block) => block.blockHash);
  const finalizedBlocks = new MaxSizeSet(MAX_CACHED_BLOCK);

  describe('add blockhash', () => {
    it('correctly find hashes, and prune old blocks', () => {
      chain.forEach(({ blockHash }, lastCacheBlockIdx) => {
        finalizedBlocks.add(blockHash);

        // check adding already-exist block
        finalizedBlocks.add(blockHash);
        finalizedBlocks.add(blockHash);

        // check cached hashes are correct
        const firstCacheBlockIdx = Math.max(0, lastCacheBlockIdx - MAX_CACHED_BLOCK + 1);
        const expectedCachedHashes = allBlockHashes.filter((_, i) => i >= firstCacheBlockIdx && i <= lastCacheBlockIdx);
        expect(expectedCachedHashes).to.deep.equal(finalizedBlocks.toString());

        // check has() method behaves as expected
        for (const [i, _blockHash] of allBlockHashes.entries()) {
          const isBlockInCache = i >= firstCacheBlockIdx && i <= lastCacheBlockIdx;
          const res = finalizedBlocks.has(_blockHash);

          expect(res).to.equal(isBlockInCache ? true : false);
        }
      });
    });
  });
});
