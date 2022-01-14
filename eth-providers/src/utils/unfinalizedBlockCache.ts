interface HashToBlockMap {
  [hash: string]: number;
}

interface BlockToHashesMap {
  [block: string]: string[];
}

export class UnfinalizedBlockCache {
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

  _inspect = (): any => ({
    extraBlockCount: this.extraBlockCount,
    cachedBlocksCount: Object.keys(this.blockTxHashes).length,
    cachedBlocks: Object.keys(this.blockTxHashes),
    allBlockToHash: this.blockTxHashes,
    allHashToBlock: this.allTxHashes
  });
}
