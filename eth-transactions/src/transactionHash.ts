import { createTransactionPayload } from './createTransactionPayload';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { Eip712TransactionPayload } from './types';

export const transactionHash = (tx: Eip712TransactionPayload): string => {
  const payload = createTransactionPayload(tx);

  return _TypedDataEncoder.hash(
    payload.domain,
    {
      Transaction: payload.types.Transaction
    },
    payload.message
  );
};
