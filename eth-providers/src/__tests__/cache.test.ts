import { expect } from 'chai';
import { it } from 'mocha';
import { UnfinalizedBlockCache } from '../utils/unfinalizedBlockCache';

const randFakeHash = (): string => Math.floor(Math.random() * 66666666).toString(16);

const mockBlock = (): string[] => Array.from({ length: Math.floor(Math.random() * 5) }, () => randFakeHash());

const mockChain = (blocksCount: number = 50): string[][] => Array.from({ length: blocksCount }, () => mockBlock());

describe('UnfinalizedBlockCache', () => {
  const cache = new UnfinalizedBlockCache();
  const TOTAL_BLOCKS = 80;
  const chain = mockChain(TOTAL_BLOCKS);

  describe('initialization', () => {
    it('initialize two empty map', () => {
      expect(cache.blockTxHashes).to.deep.equal({});
      expect(cache.allTxHashes).to.deep.equal({});
    });
  });

  describe('add block', () => {
    it('correctly find cached transactions', () => {
      chain.forEach((transactions, idx) => cache.addTxsAtBlock(idx, transactions));

      for (let blockNumber = 0; blockNumber < TOTAL_BLOCKS; blockNumber++) {
        for (const curTx of chain[blockNumber]) {
          expect(cache.getBlockNumber(curTx)).to.equal(blockNumber);
        }
      }
    });
  });

  describe('update finalized block', () => {
    it('correctly remove tx from finalized block', () => {
      chain.forEach((transactions, idx) => cache.addTxsAtBlock(idx, transactions));

      for (let blockNumber = 0; blockNumber < TOTAL_BLOCKS; blockNumber++) {
        const curBlock = chain[blockNumber];
        cache.removeTxsAtBlock(blockNumber);

        // these tx from finalized block should be removed
        for (const curTx of curBlock) {
          expect(cache.getBlockNumber(curTx)).to.equal(undefined);
        }

        // these tx from unfinalized block should still be there
        // ufbn => unfinalizeBlockNumber
        for (let ufbn = blockNumber + 1; ufbn < TOTAL_BLOCKS; ufbn++) {
          for (const tx of chain[ufbn]) {
            expect(cache.getBlockNumber(tx)).to.equal(ufbn);
          }
        }
      }
    });
  });
});
