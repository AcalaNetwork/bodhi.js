import { FullReceipt } from '../utils';

type MochBlock = {
  blockHash: string;
  blockNumber: number;
  receipts: FullReceipt[];
};
type MochChain = MochBlock[];

export const randHash = (): string => {
  const hash = Math.floor(Math.random() * 66666666).toString(16);
  return '0x' + hash.padStart(64, '0');
};

export const randReceipt = (blockNumber: number, blockHash: string): FullReceipt =>
  ({
    blockHash,
    blockNumber,
    transactionHash: randHash(),
  } as FullReceipt);

export const mockBlock = (blockNumber: number): MochBlock => {
  const blockHash = randHash();
  const receipts = Array.from({ length: Math.floor(Math.random() * 5) }, () => randReceipt(blockNumber, blockHash));

  return {
    blockNumber,
    blockHash,
    receipts,
  };
};

export const mockChain = (blocksCount = 50, fork = true): MochChain => {
  return Array.from({ length: blocksCount }, (_, blockNum) => {
    const forkCount = fork ? Math.floor(Math.random() * 3) : 0;

    const blocks = [mockBlock(blockNum)];
    for (let i = 0; i < forkCount; i++) {
      blocks.push(mockBlock(blockNum));
    }

    return blocks;
  }).flat();
};
