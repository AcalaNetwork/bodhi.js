export interface HashToBlockMap {
  [hash: string]: number;
}

export interface BlockToHashesMap {
  [block: string]: string[];
}

export interface CacheInspect {
  extraBlockCount: number;
  cachedBlocksCount: number;
  cachedBlocks: string[];
  allBlockToHash: Record<string, string[]>;
  allHashToBlock: Record<string, number>;
}

export class BlockCache {
  blockTxHashes: BlockToHashesMap;
  allTxHashes: HashToBlockMap;
  extraBlockCount: number;

  constructor(extraBlockCount: number = 10) {
    this.blockTxHashes = {};
    this.allTxHashes = {};
    this.extraBlockCount = extraBlockCount;
  }

  addTxsAtBlock(blockNumber: number, txHashes: string[]): void {
    txHashes.forEach((h) => (this.allTxHashes[h] = blockNumber));
    this.blockTxHashes[blockNumber] = txHashes;
  }

  handleFinalizedBlock(blockNumber: number): void {
    const blockToRemove = blockNumber - this.extraBlockCount;
    this.blockTxHashes[blockToRemove]?.forEach((h) => delete this.allTxHashes[h]);
    delete this.blockTxHashes[blockToRemove];
  }

  getBlockNumber(hash: string): number | undefined {
    return this.allTxHashes[hash];
  }

  _inspect = (): CacheInspect => ({
    extraBlockCount: this.extraBlockCount,
    cachedBlocksCount: Object.keys(this.blockTxHashes).length,
    cachedBlocks: Object.keys(this.blockTxHashes),
    allBlockToHash: this.blockTxHashes,
    allHashToBlock: this.allTxHashes
  });
}
