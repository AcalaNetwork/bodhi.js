import { joinSignature } from '@ethersproject/bytes';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { Wallet } from '@ethersproject/wallet';
import { createTransactionPayload } from './createTransactionPayload';
import { Eip712TransactionPayload } from './types';

export const signTransaction = (privateKey: string, tx: Eip712TransactionPayload): string => {
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
