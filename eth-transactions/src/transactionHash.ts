import { createTransactionPayload } from './createTransactionPayload';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { AcalaEvmTXPayload } from './types';

export const transactionHash = (tx: AcalaEvmTXPayload): string => {
  const payload = createTransactionPayload(tx);

  return _TypedDataEncoder.hash(
    payload.domain,
    {
      AccessList: payload.types.AccessList,
      Transaction: payload.types.Transaction
    },
    payload.message
  );
};
