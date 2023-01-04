import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { CompareResult, Diff, TxReceipt } from './types';

const sortById = (tx1: TxReceipt, tx2: TxReceipt) => {
  const [block1, index1] = tx1.id.split('-');
  const [block2, index2] = tx2.id.split('-');

  return block1 === block2 ? parseInt(index1) - parseInt(index2) : parseInt(block1) - parseInt(block2);
};

const filterByBlockRange = (start: number, end: number) => (tx: TxReceipt) => {
  const blockNumber = parseInt(tx.block_number);
  return blockNumber >= start && blockNumber <= end;
};

const getExtra = (data1: TxReceipt[], data2: TxReceipt[]): TxReceipt[] => {
  const res = [];
  for (const tx of data1) {
    const tx2 = data2.find(({ id }) => id === tx.id);
    !tx2 && res.push(tx);
  }

  return res;
};

const getDiff = (data1: TxReceipt[], data2: TxReceipt[]): Diff[] => {
  const res = [];
  for (const tx of data1) {
    const tx2 = data2.find(({ id }) => id === tx.id);
    if (tx2) {
      const diff = txDiff(tx, tx2);
      diff && res.push(diff);
    }
  }

  return res;
};

const txDiff = (tx1: TxReceipt, tx2: TxReceipt): Diff | null => {
  const diff = {} as Diff;
  for (const [k, v] of Object.entries(tx1)) {
    if (tx2[k] !== v) {
      diff[k] = `${v}, ${tx2[k]}`;
    }
  }

  return Object.keys(diff).length > 0 ? { id: tx1.id, ...diff } : null;
};

export const compareSubqlData = (
  data1: TxReceipt[],
  data2: TxReceipt[],
  startBlock?: number,
  endBlock?: number
): CompareResult => {
  const start = startBlock ?? 0;
  const end = endBlock ?? Infinity;
  const rangeFilter = filterByBlockRange(start, end);

  // maybe sort is not needed, looks like by default it's sorted this way
  const d1 = data1.filter(rangeFilter).sort(sortById);
  const d2 = data2.filter(rangeFilter).sort(sortById);

  console.log({
    dataSize1: data1.length,
    dataSize2: data2.length
  });

  return {
    '+': getExtra(d1, d2),
    '-': getExtra(d2, d1),
    '!=': getDiff(d1, d2)
  };
};

export const readCSV = (path: string): TxReceipt[] => {
  const rawData = fs.readFileSync(path);
  return parse(rawData, {
    columns: true,
    skip_empty_lines: true
  });
};
