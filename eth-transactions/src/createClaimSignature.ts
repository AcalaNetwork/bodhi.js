import { joinSignature } from '@ethersproject/bytes';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { Wallet } from '@ethersproject/wallet';
import { createClaimPayload } from './createClaimPayload';
import { ClaimPayload } from './types';

export const createClaimSignature = (privateKey: string, tx: ClaimPayload): string => {
  const payload = createClaimPayload(tx);

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
