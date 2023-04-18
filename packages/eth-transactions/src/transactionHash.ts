import { AcalaEvmTXPayload } from './types';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { createTransactionPayload } from './createTransactionPayload';

export const transactionHash = (tx: AcalaEvmTXPayload): string => {
  const payload = createTransactionPayload(tx);

  return _TypedDataEncoder.hash(
    payload.domain,
    {
      AccessList: payload.types.AccessList,
      Transaction: payload.types.Transaction,
    },
    payload.message
  );
};
