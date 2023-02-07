export interface BaseInfo {
  id: string,
  block_number: string,
  block_hash: string,
  transaction_hash: string,
  transaction_index: string,
  timestamp: string,
}

export interface TxReceipt extends BaseInfo {
  to?: string,
  from: string,
  contract_address?: string,
  gas_used: string,
  logs_bloom: string,
  effective_gas_price: string,
  cumulative_gas_used: string,
  type: string,
  status: string,
  exit_reason: string,
};

export interface Log extends BaseInfo {
  removed: string,
  address: string,
  data: string,
  topics: string,
  log_index: string,
  receipt_id: string,
};

export type LogOrReceipt = Log | TxReceipt;

export type Diff<T extends LogOrReceipt> = Partial<T>;
export interface CompareResult<T extends LogOrReceipt> {
  '+': T[],
  '-': T[],
  '!=': Diff<T>[],
}

export interface IdToDataMap<T extends LogOrReceipt> {
  [id: string]: T
}
