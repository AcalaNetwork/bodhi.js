interface HashToBlockMap {
  [hash: string]: number;
}

interface BlockToHashesMap {
  [block: string]: string[];
}

export class UnfinalizedBlockCache {
  blockTxHashes: BlockToHashesMap = {};
  allTxHashes: HashToBlockMap = {};

  addTxsAtBlock(blockNumber: number, txHashes: string[]): void {
    txHashes.forEach((h) => (this.allTxHashes[h] = blockNumber));
    this.blockTxHashes[blockNumber] = txHashes;
  }

  removeTxsAtBlock(blockNumber: number): void {
    this.blockTxHashes[blockNumber]?.forEach((h) => delete this.allTxHashes[h]);
    delete this.blockTxHashes[blockNumber];
  }

  getBlockNumber(hash: string): number | undefined {
    return this.allTxHashes[hash];
  }
}
