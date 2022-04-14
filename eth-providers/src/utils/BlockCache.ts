export interface HashToBlockMap {
  [hash: string]: number;
}

export interface BlockToHashesMap {
  [block: string]: string[];
}

export interface CacheInspect {
  maxCachedBlocks: number;
  cachedBlocksCount: number;
  cachedBlocks: string[];
  allBlockToHash: Record<string, string[]>;
  allHashToBlock: Record<string, number>;
}

export class BlockCache {
  blockToHashes: BlockToHashesMap;
  hashToBlocks: HashToBlockMap;
  maxCachedBlocks: number;

  constructor(maxCachedBlocks: number = 200) {
    this.blockToHashes = {};
    this.hashToBlocks = {};
    this.maxCachedBlocks = maxCachedBlocks;
  }

  // automatically preserve a sliding window of ${maxCachedBlocks} blocks
  addTxsAtBlock(blockNumber: number, txHashes: string[]): void {
    txHashes.forEach((h) => (this.hashToBlocks[h] = blockNumber));
    this.blockToHashes[blockNumber] = txHashes;

    const cachedBlocksCount = Object.keys(this.blockToHashes).length;
    if (cachedBlocksCount > this.maxCachedBlocks) {
      const blockToRemove = Object.keys(this.blockToHashes)[0]; // assume insert order
      this._removeBlock(parseInt(blockToRemove));
    }
  }

  // if block exist in cache, remove it, otherwise do nothing
  _removeBlock(blockToRemove: number): void {
    this.blockToHashes[blockToRemove]?.forEach((h) => delete this.hashToBlocks[h]);
    delete this.blockToHashes[blockToRemove];
  }

  getBlockNumber(hash: string): number | undefined {
    return this.hashToBlocks[hash];
  }

  _inspect = (): CacheInspect => ({
    maxCachedBlocks: this.maxCachedBlocks,
    cachedBlocksCount: Object.keys(this.blockToHashes).length,
    cachedBlocks: Object.keys(this.blockToHashes),
    allBlockToHash: this.blockToHashes,
    allHashToBlock: this.hashToBlocks
  });
}
