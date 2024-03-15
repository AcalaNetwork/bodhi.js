import { Log, TransactionReceipt } from '@ethersproject/abstract-provider';

export type TxHashToReceipt = Record<string, TransactionReceipt>;
export type BlockHashToReceipts = Record<string, TransactionReceipt[]>;
export type Block = {
  number: number;
  hash: string;
}

export interface CacheInspect {
  maxCachedBlocks: number;
  cachedBlocksCount: number;
  txHashToReceipt: TxHashToReceipt;
  blockHashToReceipts: BlockHashToReceipts;
}

export class BlockCache {
  blockHashToReceipts: BlockHashToReceipts;
  txHashToReceipt: TxHashToReceipt;
  cachedBlockHashes: string[];
  maxCachedBlocks: number;
  lastCachedBlock: Block;

  constructor(maxCachedBlocks = 200) {
    this.txHashToReceipt = {};
    this.blockHashToReceipts = {};
    this.cachedBlockHashes = [];
    this.maxCachedBlocks = maxCachedBlocks;
    this.lastCachedBlock = null;
  }

  setlastCachedBlock = (block: Block) => (this.lastCachedBlock = block);

  // automatically preserve a sliding window of ${maxCachedBlocks} blocks
  addReceipts = (blockHash: string, receipts: TransactionReceipt[]): void => {
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
  };

  getReceiptByHash = (txHash: string): TransactionReceipt | null =>
    this.txHashToReceipt[txHash] ?? null;

  getAllReceiptsAtBlock = (blockHash: string): TransactionReceipt[] =>
    this.blockHashToReceipts[blockHash] ?? [];

  getReceiptAtBlock = (txHash: string, blockHash: string): TransactionReceipt | null =>
    this.getAllReceiptsAtBlock(blockHash).find(r => r.transactionHash === txHash) ?? null;

  getLogsAtBlock = (blockHash: string): Log[] =>
    this.getAllReceiptsAtBlock(blockHash).map(r => r.logs).flat();

  inspect = (): CacheInspect => ({
    maxCachedBlocks: this.maxCachedBlocks,
    cachedBlocksCount: Object.keys(this.blockHashToReceipts).length,
    txHashToReceipt: this.txHashToReceipt,
    blockHashToReceipts: this.blockHashToReceipts,
  });
}
