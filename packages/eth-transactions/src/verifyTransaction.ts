import { AcalaEvmTXPayload } from './types';
import { createTransactionPayload } from './createTransactionPayload';
import { verifyTypedData } from '@ethersproject/wallet';

export const verifyTransaction = (tx: AcalaEvmTXPayload, signature: string): string => {
  const payload = createTransactionPayload(tx);

  return verifyTypedData(
    payload.domain,
    {
      AccessList: payload.types.AccessList,
      Transaction: payload.types.Transaction
    },
    payload.message,
    signature
  );
};
