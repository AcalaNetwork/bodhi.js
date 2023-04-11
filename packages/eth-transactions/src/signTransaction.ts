import { AcalaEvmTXPayload } from './types';
import { Wallet } from '@ethersproject/wallet';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { createTransactionPayload } from './createTransactionPayload';
import { joinSignature } from '@ethersproject/bytes';

export const signTransaction = (privateKey: string, tx: AcalaEvmTXPayload): string => {
  const payload = createTransactionPayload(tx);

  const wallet = new Wallet(privateKey);

  return joinSignature(
    wallet._signingKey().signDigest(
      _TypedDataEncoder.hash(
        payload.domain,
        {
          AccessList: payload.types.AccessList,
          Transaction: payload.types.Transaction
        },
        payload.message
      )
    )
  );
};
