import { createTransactionPayload } from './createTransactionPayload';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { verifyTypedData, Wallet } from '@ethersproject/wallet';
import {
  arrayify,
  Bytes,
  BytesLike,
  concat,
  hexDataSlice,
  isHexString,
  joinSignature,
  SignatureLike
} from '@ethersproject/bytes';

type Transaction = {
  chainId: number;
  nonce: number;
  gasLimit: number;
  to?: string;
  value: string;
  data: string;
};

export const verifyTransaction = (tx: Transaction, signature: string): string => {
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
