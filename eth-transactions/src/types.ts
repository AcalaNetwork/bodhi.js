import { BigNumberish } from '@ethersproject/bignumber';
import { BytesLike } from '@ethersproject/bytes';
import { UnsignedTransaction, Transaction } from '@ethersproject/transactions';

export type ClaimPayload = {
  chainId: BigNumberish;
  salt: BytesLike;

  substrateAddress?: string | Uint8Array | null;
};

export type AcalaEvmTXPayload = {
  chainId: BigNumberish;
  salt?: BytesLike;

  action?: 'Create' | 'Call';
  to?: string;
  nonce: BigNumberish;
  tip?: BigNumberish;
  data: BytesLike;
  value?: BigNumberish;
  gasLimit?: BigNumberish;
  storageLimit?: BigNumberish;
  validUntil?: BigNumberish;
};

export interface AcalaEvmTX extends Transaction {
  salt?: BytesLike;
  storageLimit?: BigNumberish;
  validUntil?: BigNumberish;
  tip?: BigNumberish;
}

export interface UnsignedAcalaEvmTX extends UnsignedTransaction {
  salt?: BytesLike;
  storageLimit?: BigNumberish;
  validUntil?: BigNumberish;
  tip?: BigNumberish;
}
