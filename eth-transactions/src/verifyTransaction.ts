import { verifyTypedData } from '@ethersproject/wallet';
import { createTransactionPayload } from './createTransactionPayload';
import { AcalaEvmTXPayload } from './types';

export const verifyTransaction = (tx: AcalaEvmTXPayload, signature: string): string => {
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
