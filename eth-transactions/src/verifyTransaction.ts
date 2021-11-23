import { verifyTypedData } from '@ethersproject/wallet';
import { createTransactionPayload } from './createTransactionPayload';
import { Eip712TransactionPayload } from './types';

export const verifyTransaction = (tx: Eip712TransactionPayload, signature: string): string => {
  const payload = createTransactionPayload(tx);

  return verifyTypedData(
    payload.domain,
    {
      Transaction: payload.types.Transaction
    },
    payload.message,
    signature
  );
};
