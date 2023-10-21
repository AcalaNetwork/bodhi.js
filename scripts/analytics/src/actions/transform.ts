import { FP_DATA_TYPE } from '../consts';
import { readCSV, writeCSV } from '../utils';

interface StakeTxRaw {
  id: string;
  from: string;
  tx_hash: string;
  block_number: string;
  timestamp: string;
  pool_id: string;
  amount: string;
}

interface StakeTx {
  from: string;
  tx_hash: string;
  block_number: number;
  timestamp: string;
  pool_id: number;
  amount: number;
}

// truncate *last* x percent of data
const _truncate = async (csvData: any[], percent: number) => {
  if (percent <= 0 || percent > 100) {
    throw new Error('invalid truncate percent');
  }

  const rowCount = csvData.length;
  const rowsToExtract = Math.ceil(rowCount * (percent / 100));
  return csvData.slice(-rowsToExtract);
};

// this shape is compatible with Footprint
const formatDate = (input: string): string => {
  const date = new Date(input);

  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so we add 1
  const DD = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
};

const toSimpleTimestamp = (csvData: any[]) => csvData.map(rowData => ({
  ...rowData,
  timestamp: formatDate(rowData.timestamp),
}));

export async function transformCSV(filename: string): Promise<void> {
  console.log(`transforming ${filename} ...`);
  const rawData = await readCSV(filename);
  const data = toSimpleTimestamp(rawData);

  await writeCSV(filename, data);
  console.log('transformation finished!');
}

export const toFPCompatible = (data: any[], type: FP_DATA_TYPE) => {
  if (type === FP_DATA_TYPE.EuphratesStake) {
    return data.map<StakeTx>((row: StakeTxRaw) => ({
      block_number: parseInt(row.block_number, 10),
      timestamp: row.timestamp,
      from: row.from,
      tx_hash: row.tx_hash,
      pool_id: parseInt(row.pool_id, 10),
      amount: parseInt(row.amount, 10),
    }));
  } if (type === FP_DATA_TYPE.AcalaLogs) {
    return data.map((row: any) => ({
      block_number: parseInt(row.block_number, 10),
      timestamp: row.timestamp,
      block_hash: row.block_hash,
      transaction_index: parseInt(row.transaction_index, 10),
      log_index: parseInt(row.log_index, 10),
      address: row.address,
      data: row.data,
      topics: row.topics,
      transaction_hash: row.transaction_hash,
    }));
  } if (type === FP_DATA_TYPE.AcalaReceipts) {
    return data.map((row: any) => ({
      block_number: parseInt(row.block_number, 10),
      timestamp: row.timestamp,
      from: row.from,
      to: row.to,
      block_hash: row.block_hash,
      transaction_index: parseInt(row.transaction_index, 10),
      effective_gas_price: parseInt(row.effective_gas_price, 10),
      cumulative_gas_used: parseInt(row.cumulative_gas_used, 10),
      type: parseInt(row.type, 10),
      status: parseInt(row.status, 10),
      gas_used: parseInt(row.gas_used, 10),
      contract_address: row.contract_address,
      transaction_hash: row.transaction_hash,
      logs_bloom: row.logs_bloom,
      exit_reason: row.exit_reason,
    }));
  }

  throw new Error(`<toFPCompatible> invalid type: ${type}`);
};
