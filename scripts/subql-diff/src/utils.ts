import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { CompareResult, Diff, Log, LogOrReceipt, TxReceipt, IdToDataMap } from './types';

const buildIdToDataMap = <T extends LogOrReceipt>(data: T[]): IdToDataMap<T> => {
  const res: IdToDataMap<T> = {};
  for (const d of data) {
    res[d.id] = d;
  }

  return res;
};

const filterByBlockRange = (start: number, end: number) => 
  (logOrTx: LogOrReceipt): boolean => {
    const blockNumber = parseInt(logOrTx.block_number);
    return blockNumber >= start && blockNumber <= end;
  };

const getExtra = <T extends LogOrReceipt>(data1: T[], map2: IdToDataMap<T>): T[] => {
  const res = [] as T[];
  for (const logOrTx of data1) {
    const logOrTx2 = map2[logOrTx.id];
    !logOrTx2 && res.push(logOrTx);
  }

  return res;
};

const getAllDiff = <T extends LogOrReceipt>(data1: T[], map2: IdToDataMap<T>): Diff<T>[] => {
  const res = [];
  for (const logOrTx of data1) {
    const logOrTx2 = map2[logOrTx.id];
    if (logOrTx2) {
      const diff = getDiff(logOrTx, logOrTx2);
      diff && res.push(diff);
    }
  }

  return res;
};

const getDiff = <T extends LogOrReceipt>(d1: T, d2: T): Diff<T> | null => {
  const diff = {} as Diff<T>;
  for (const [k, v] of Object.entries(d1) as [keyof T, string][]) {
    if (d2[k] !== v) {
      diff[k] = `${v}, ${d2[k]}`;
    }
  }

  return Object.keys(diff).length > 0
    ? { id: d1.id, ...diff }
    : null;
};

export const compareSubqlData = <T extends LogOrReceipt>(
  data1: T[],
  data2: T[],
  startBlock?: number,
  endBlock?: number,
): CompareResult<T> => {
  const start = startBlock ?? 0;
  const end = endBlock ?? Infinity;
  const rangeFilter = filterByBlockRange(start, end);

  const d1 = data1.filter(rangeFilter);
  const d2 = data2.filter(rangeFilter);

  console.log({
    dataSize1: d1.length,
    dataSize2: d2.length,
    sizeDiff: d1.length - d2.length,
  });

  // using map is much faster than array: O(N) => O(1)
  // this can make logs compare: 20s => 2s
  const dataMap1 = buildIdToDataMap(d1);
  const dataMap2 = buildIdToDataMap(d2);

  return {
    '+': getExtra(d1, dataMap2),
    '-': getExtra(d2, dataMap1),
    '!=': getAllDiff(d1, dataMap2),
  };
};

export const readCSV = (path: string): Array<TxReceipt | Log> => {
  const rawData = fs.readFileSync(path);
  return parse(rawData, {
    columns: true,
    skip_empty_lines: true,
  });
};

export const deepClone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
