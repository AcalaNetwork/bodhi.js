export interface TxReceipt {
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

export type Diff = Partial<TxReceipt>;
export interface CompareResult {
  '+': TxReceipt[];
  '-': TxReceipt[];
  '!=': Diff[];
}
