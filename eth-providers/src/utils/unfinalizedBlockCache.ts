import { TransactionReceipt } from 'src';

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

  updateFinalizedHead(blockNumber: number): void {
    this.blockTxHashes[blockNumber].forEach((h) => delete this.allTxHashes[h]);
    delete this.blockTxHashes[blockNumber];
  }

  getBlockNumber(hash: string): number | undefined {
    return this.allTxHashes[hash];
  }
}

// const createUnfinalizedBlockCache = (api: ApiPromise): UnfinalizedBlockCache => {
//   const cache = new UnfinalizedBlockCache()

//   this.api.rpc.chain.subscribeNewHeads(header => {
//     const txHashes = getTxHashes(header);
//     cache.addBlock(header.blockNumber, txHashes)
//   });

//   this.api.rpc.chain.subscribeFinalizedHeads(header => {
//     cache.updateFinalizedHead(header.blockNumber)
//   });

//   return cache;
// }

// const cache = createUnfinalizedBlockCache();

// const getTxFromCache = (txHash): TransactionReceipt | null => {
//   const blockNumber = cache.getBlockNumber(txHash);
//   return blockNumber ? getTransactionReceiptAtBlock(txHash, blockNumber) : null;
// }
