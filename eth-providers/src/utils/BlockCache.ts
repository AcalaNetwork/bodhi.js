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
  blockToHashes: BlockToHashesMap;
  hashToBlocks: HashToBlockMap;
  extraBlockCount: number;

  constructor(extraBlockCount: number = 200) {
    this.blockToHashes = {};
    this.hashToBlocks = {};
    this.extraBlockCount = extraBlockCount;
  }

  addTxsAtBlock(blockNumber: number, txHashes: string[]): void {
    txHashes.forEach((h) => (this.hashToBlocks[h] = blockNumber));
    this.blockToHashes[blockNumber] = txHashes;
  }

  _removeBlock(blockToRemove: number): void {
    this.blockToHashes[blockToRemove]?.forEach((h) => delete this.hashToBlocks[h]);
    delete this.blockToHashes[blockToRemove];
  }

  handleFinalizedBlock(blockNumber: number): void {
    const blockToRemove = blockNumber - this.extraBlockCount;
    this._removeBlock(blockToRemove);
  }

  getBlockNumber(hash: string): number | undefined {
    return this.hashToBlocks[hash];
  }

  // prune all data except latest ${extraBlockCount} records
  prune(): void {
    const cachedBlocks = Object.keys(this.blockToHashes);
    if (cachedBlocks.length <= this.extraBlockCount) return;

    const latestBlock = parseInt(cachedBlocks[cachedBlocks.length - 1]);
    const pruneStartBlock = latestBlock - this.extraBlockCount;
    const pruneBlocks = cachedBlocks.filter((blockNumber) => parseInt(blockNumber) <= pruneStartBlock);

    pruneBlocks.forEach((block) => this._removeBlock(Number(block)));
  }

  _inspect = (): CacheInspect => ({
    extraBlockCount: this.extraBlockCount,
    cachedBlocksCount: Object.keys(this.blockToHashes).length,
    cachedBlocks: Object.keys(this.blockToHashes),
    allBlockToHash: this.blockToHashes,
    allHashToBlock: this.hashToBlocks
  });
}
