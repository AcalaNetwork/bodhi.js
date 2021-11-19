import { createTransactionPayload } from './createTransactionPayload';
import { _TypedDataEncoder } from '@ethersproject/hash';

type Transaction = {
  chainId: number;
  nonce: number;
  gasLimit: number;
  to?: string;
  value: string;
  data: string;
};

export const transactionHash = (tx: Transaction): string => {
  const payload = createTransactionPayload(tx);

  return _TypedDataEncoder.hash(
    payload.domain,
    {
      Transaction: payload.types.Transaction
    },
    payload.message
  );
};
