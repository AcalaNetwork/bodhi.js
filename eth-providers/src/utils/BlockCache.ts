import { Header, SignedBlock } from '@polkadot/types/interfaces';
import LRUCache from 'lru-cache';
import { FullReceipt } from './transactionReceiptHelper';

export type TxHashToReceipt = Record<string, FullReceipt>;
export type BlockHashToReceipts = Record<string, FullReceipt[]>;

export interface CacheInspect {
  maxCachedBlocks: number;
  cachedBlocksCount: number;
  txHashToReceipt: TxHashToReceipt;
  blockHashToReceipts: BlockHashToReceipts;
}

export class BlockCache {
  headerCache: LRUCache<string, Header>;
  blockCache: LRUCache<string, SignedBlock>;
  blockHashToReceipts: BlockHashToReceipts;
  txHashToReceipt: TxHashToReceipt;
  cachedBlockHashes: string[];
  maxCachedBlocks: number;

  constructor(maxCachedBlocks: number = 200) {
    this.txHashToReceipt = {};
    this.blockHashToReceipts = {};
    this.cachedBlockHashes = [];
    this.maxCachedBlocks = maxCachedBlocks;
    this.headerCache = new LRUCache({ max: maxCachedBlocks });
    this.blockCache = new LRUCache({ max: maxCachedBlocks });
  }

  // automatically preserve a sliding window of ${maxCachedBlocks} blocks
  addReceipts = (blockHash: string, receipts: FullReceipt[]): void => {
    this.blockHashToReceipts[blockHash] = receipts;
    receipts.forEach(r => {
      this.txHashToReceipt[r.transactionHash] = r;
    });
    this.cachedBlockHashes.push(blockHash);

    if (this.cachedBlockHashes.length > this.maxCachedBlocks) {
      const removingBlockHash = this.cachedBlockHashes.shift()!;
      const removingTxs = this.blockHashToReceipts[removingBlockHash];

      removingTxs?.forEach(tx => {
        delete this.txHashToReceipt[tx.transactionHash];
      });
      delete this.blockHashToReceipts[removingBlockHash];
    }
  }

  getReceiptByHash = (txHash: string): FullReceipt | null => this.txHashToReceipt[txHash] ?? null;

  getAllReceiptsAtBlock = (blockHash: string): FullReceipt[] => this.blockHashToReceipts[blockHash] ?? [];

  getReceiptAtBlock = (txHash: string, blockHash: string): FullReceipt | null => {
    return this.getAllReceiptsAtBlock(blockHash).find(r => r.transactionHash === txHash) ?? null;
  }

  setHeaderCache = (blockHash: string, header: Header): void => {
    this.headerCache.set(blockHash, header);
  }

  setBlockCache = (blockHash: string, block: SignedBlock): void => {
    this.blockCache.set(blockHash, block);
  }

  getHeader = (blockHash: string): Header | undefined => {
    return this.headerCache.get(blockHash);
  }

  getBlock = (blockHash: string): SignedBlock | undefined => {
    return this.blockCache.get(blockHash);
  }

  inspect = (): CacheInspect => ({
    maxCachedBlocks: this.maxCachedBlocks,
    cachedBlocksCount: Object.keys(this.blockHashToReceipts).length,
    txHashToReceipt: this.txHashToReceipt,
    blockHashToReceipts: this.blockHashToReceipts,
  });
}
