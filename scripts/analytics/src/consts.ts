export const DB_CONFIG_PROD = {
  host: 'evm-subql-cluster.cluster-ro-cwi35kgo8jvg.ap-southeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres_ro',
};

export const DB_CONFIG_DEV = {
  host: 'subql-evm.cluster-cspmstlhvanj.ap-southeast-1.rds.amazonaws.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
};

const FOOTPRINT_SCHEMA_BASE = [
  { name: 'block_number', type: 'NUMBER' },
  { name: 'timestamp', type: 'DATE' },
];

export const FOOTPRINT_SCHEMA_EUPHRATES_STAKE = [
  ...FOOTPRINT_SCHEMA_BASE,
  { name: 'tx_hash', type: 'STRING' },
  { name: 'from', type: 'STRING' },
  { name: 'pool_id', type: 'NUMBER' },
  { name: 'amount', type: 'NUMBER' },
];

export const FOOTPRINT_SCHEMA_ACALA_LOGS = [
  ...FOOTPRINT_SCHEMA_BASE,
  { name: 'block_hash', type: 'STRING' },
  { name: 'transaction_index', type: 'NUMBER' },
  { name: 'address', type: 'STRING' },
  { name: 'data', type: 'STRING' },
  { name: 'topics', type: 'STRING' },
  { name: 'transaction_hash', type: 'STRING' },
  { name: 'log_index', type: 'NUMBER' },
];

export const FOOTPRINT_SCHEMA_ACALA_RECEIPTS = [
  ...FOOTPRINT_SCHEMA_BASE,
  { name: 'from', type: 'STRING' },
  { name: 'to', type: 'STRING' },
  { name: 'block_hash', type: 'STRING' },
  { name: 'transaction_index', type: 'NUMBER' },
  { name: 'gas_used', type: 'NUMBER' },
  { name: 'contract_address', type: 'STRING' },
  { name: 'transaction_hash', type: 'STRING' },
  { name: 'logs_bloom', type: 'STRING' },
  { name: 'effective_gas_price', type: 'NUMBER' },
  { name: 'cumulative_gas_used', type: 'NUMBER' },
  { name: 'type', type: 'NUMBER' },
  { name: 'status', type: 'NUMBER' },
  { name: 'exit_reason', type: 'STRING' },
];

export enum FP_DATA_TYPE {
  EuphratesStake = 'euphrates_stake',
  AcalaLogs = 'acala_logs',
  AcalaReceipts = 'acala_receipts',
}

export const getFPSchema = (type: FP_DATA_TYPE) => {
  if (type === FP_DATA_TYPE.EuphratesStake) return FOOTPRINT_SCHEMA_EUPHRATES_STAKE;
  if (type === FP_DATA_TYPE.AcalaLogs) return FOOTPRINT_SCHEMA_ACALA_LOGS;
  if (type === FP_DATA_TYPE.AcalaReceipts) return FOOTPRINT_SCHEMA_ACALA_RECEIPTS;

  throw new Error(`<getFPSchema> invalid type: ${type}`);
};
