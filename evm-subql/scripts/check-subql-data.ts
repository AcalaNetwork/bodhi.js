import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { yargsOptions } from './utils';

interface TxReceipt {
  id: string;
  to: string;
  from: string;
  contract_address: string;
  transaction_index: string;
  gas_used: string;
  logs_bloom: string;
  block_hash: string;
  transaction_hash: string;
  block_number: string;
  effective_gas_price: string;
  cumulative_gas_used: string;
  type: string;
  status: string;
  exit_reason: string;
  timestamp: string;
}

type Diff = Partial<TxReceipt>;
interface CompareResult {
  '+': TxReceipt[];
  '-': TxReceipt[];
  '!=': Diff[];
}

const readCSV = (path: string): TxReceipt[] => {
  const rawData = fs.readFileSync(path);
  return parse(rawData, {
    columns: true,
    skip_empty_lines: true
  });
};

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

export const compare = (
  data1: TxReceipt[],
  data2: TxReceipt[],
  startBlock?: number,
  endBlock?: number
): CompareResult => {
  const start = startBlock ?? 0;
  const end = endBlock ?? Infinity;
  const rangeFilter = filterByBlockRange(start, end);

  // maybe sort is not needed, looks like by default it's sorted this way
  const d1 = data1.sort(sortById).filter(rangeFilter);
  const d2 = data2.sort(sortById).filter(rangeFilter);

  console.log(data1.length, data2.length);

  return {
    '+': getExtra(d1, d2),
    '-': getExtra(d2, d1),
    '!=': getDiff(d1, d2)
  };
};

const main = async () => {
  const opts = await yargsOptions;

  const data1 = readCSV(opts.file1);
  const data2 = readCSV(opts.file2);

  const res = compare(data1, data2, opts.startBlock, opts.endBlock);

  if (!opts.full) {
    res['+'] = res['+'].map((tx) => tx.id) as any;
    res['-'] = res['-'].map((tx) => tx.id) as any;
    res['!='] = res['!='].map((tx) => tx.id) as any;
  }

  console.log(res);
  console.log({
    'extra records': res['+'].length,
    'missing records': res['-'].length,
    'diff records': res['!='].length
  });
};

main();
