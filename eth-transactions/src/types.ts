import { BigNumberish } from '@ethersproject/bignumber';
import { BytesLike } from '@ethersproject/bytes';
import { UnsignedTransaction, Transaction } from '@ethersproject/transactions';

export type Eip712TransactionPayload = {
  chainId: BigNumberish;
  salt: BytesLike;

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

export interface Eip712Transaction extends Transaction {
  salt: BytesLike;
  storageLimit?: BigNumberish;
  validUntil?: BigNumberish;
}

export interface UnsignedEip712Transaction extends UnsignedTransaction {
  salt: BytesLike;
  storageLimit?: BigNumberish;
  validUntil?: BigNumberish;
}
