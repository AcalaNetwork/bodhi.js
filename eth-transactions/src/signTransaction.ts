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

export const signTransaction = (privateKey: string, tx: Transaction): string => {
  const payload = createTransactionPayload(tx);

  const wallet = new Wallet(privateKey);

  return joinSignature(
    wallet._signingKey().signDigest(
      _TypedDataEncoder.hash(
        payload.domain,
        {
          Transaction: payload.types.Transaction
        },
        payload.message
      )
    )
  );
};
