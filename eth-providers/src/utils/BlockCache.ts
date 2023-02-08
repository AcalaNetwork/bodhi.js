import { FullReceipt } from './transactionReceiptHelper';

export type HashToReceipt = Record<string, FullReceipt>;
export type BlockNumToReceipts = Record<number, FullReceipt[]>;

export interface CacheInspect {
  maxCachedBlocks: number;
  cachedBlocksCount: number;
  hashToReceipt: HashToReceipt;
  blockNumToReceipts: BlockNumToReceipts;
}

export class BlockCache {
  blockNumToReceipts: BlockNumToReceipts;
  hashToReceipt: HashToReceipt;
  maxCachedBlocks: number;

  constructor(maxCachedBlocks: number = 200) {
    this.hashToReceipt = {};
    this.blockNumToReceipts = {};
    this.maxCachedBlocks = maxCachedBlocks;
  }

  // automatically preserve a sliding window of ${maxCachedBlocks} blocks
  addReceipts = (blockNumber: number, receipts: FullReceipt[]): void => {
    this.blockNumToReceipts[blockNumber] = receipts;
    receipts.forEach(r => {
      this.hashToReceipt[r.transactionHash] = r;
    });

    const removingBlockNum = blockNumber - this.maxCachedBlocks;
    const removingTxs = this.blockNumToReceipts[removingBlockNum];

    removingTxs?.forEach(tx => {
      delete this.hashToReceipt[tx.transactionHash];
    });
    delete this.blockNumToReceipts[removingBlockNum];
  }

  getReceiptByHash = (txHash: string): FullReceipt | null => this.hashToReceipt[txHash] ?? null;

  getAllReceiptsAtBlock = (blockNumber: number): FullReceipt[] => this.blockNumToReceipts[blockNumber] ?? [];

  getReceiptAtBlock = (blockNumber: number, txHash: string): FullReceipt | null => {
    return this.getAllReceiptsAtBlock(blockNumber).find(r => r.transactionHash === txHash) ?? null;
  }

  inspect = (): CacheInspect => ({
    maxCachedBlocks: this.maxCachedBlocks,
    cachedBlocksCount: Object.keys(this.blockNumToReceipts).length,
    hashToReceipt: this.hashToReceipt,
    blockNumToReceipts: this.blockNumToReceipts,
  });
}
