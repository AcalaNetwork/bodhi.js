import { Vec } from "@polkadot/types";
import { Extrinsic } from "@polkadot/types/interfaces";
import { extrinsics } from "@polkadot/types/interfaces/definitions";

interface HashToBlockMap {
  [hash: string]: number;
}

interface BlockToHashesMap {
  [block: string]: string[];
}

export class BlockCache {
  extraBlockCount: number;
  blockTxHashes: BlockToHashesMap;
  allTxHashes: HashToBlockMap;
  pendingExtrinsics?: Vec<Extrinsic>;
  pendingHashes: Set<string>;

  constructor(extraBlockCount: number = 10) {
    this.blockTxHashes = {};
    this.allTxHashes = {};
    this.extraBlockCount = extraBlockCount;
    this.pendingExtrinsics = undefined;
    this.pendingHashes = new Set();
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

  setPendingExtrinsics(extrinsics: Vec<Extrinsic>): void {
    this.pendingExtrinsics = extrinsics;
    this.pendingHashes = new Set(extrinsics.toArray().map(e => e.hash.toHex()));
  }

  isTXPending(txHash: string): boolean {
    return this.pendingHashes.has(txHash);
  }

  _inspect = (): any => ({
    extraBlockCount: this.extraBlockCount,
    cachedBlocksCount: Object.keys(this.blockTxHashes).length,
    cachedBlocks: Object.keys(this.blockTxHashes),
    allBlockToHash: this.blockTxHashes,
    allHashToBlock: this.allTxHashes
  });
}
