import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, BytesLike, hexlify, hexZeroPad, joinSignature } from '@ethersproject/bytes';
import { Zero } from '@ethersproject/constants';
import { Logger } from '@ethersproject/logger';
import * as RLP from '@ethersproject/rlp';
import { parse, Transaction, UnsignedTransaction } from '@ethersproject/transactions';
import { logger } from './logger';
import { serializeEip712 } from './serializeTransaction';
import { transactionHash } from './transactionHash';
import { verifyTransaction } from './verifyTransaction';
import { Eip712Transaction, UnsignedEip712Transaction } from './types';

function handleNumber(value: string): BigNumber {
  if (value === '0x') {
    return Zero;
  }
  return BigNumber.from(value);
}

function handleAddress(value: string): string | null {
  if (value === '0x') {
    return null;
  }
  return getAddress(value);
}

function _parseEip712Signature(
  tx: Transaction,
  fields: Array<string>,
  serialize: (tx: UnsignedEip712Transaction) => string
): void {
  try {
    const recid = handleNumber(fields[0]).toNumber();
    if (recid !== 0 && recid !== 1) {
      throw new Error('bad recid');
    }
    tx.v = recid;
  } catch (error) {
    logger.throwArgumentError('invalid v for transaction type: 1', 'v', fields[0]);
  }

  tx.r = hexZeroPad(fields[1], 32);
  tx.s = hexZeroPad(fields[2], 32);

  try {
    tx.from = verifyTransaction(
      {
        chainId: tx.chainId,
        nonce: tx.nonce,
        gasLimit: tx.gasLimit.toNumber(),
        to: tx.to,
        value: tx.value.toString(),
        data: tx.data
      },
      joinSignature({ r: tx.r, s: tx.s, v: tx.v })
    );
  } catch (error) {
    console.log(error);
  }
}

export type SignatureType = 'Ethereum' | 'AcalaEip712';

// rlp([chainId, salt, nonce, gasLimit, storageLimit, to, value, data, validUntil, eip712sig])
export function parseEip712(payload: Uint8Array): Eip712Transaction {
  const transaction = RLP.decode(payload.slice(1));

  if (transaction.length !== 9 && transaction.length !== 12) {
    logger.throwArgumentError('invalid component count for transaction type: 96', 'payload', hexlify(payload));
  }

  const tx: Eip712Transaction = {
    type: 96,
    chainId: handleNumber(transaction[0]).toNumber(),
    salt: transaction[1],
    nonce: handleNumber(transaction[2]).toNumber(),
    gasLimit: handleNumber(transaction[3]),
    storageLimit: handleNumber(transaction[4]),
    // @ts-ignore
    to: handleAddress(transaction[5]),
    value: handleNumber(transaction[6]),
    data: transaction[7],
    validUntil: handleNumber(transaction[8])
  };

  // Unsigned EIP-712 Transaction
  if (transaction.length === 9) {
    return tx;
  }

  tx.hash = transactionHash({
    chainId: tx.chainId,
    salt: tx.salt,
    storageLimit: tx.storageLimit,
    validUntil: tx.validUntil,
    nonce: tx.nonce,
    gasLimit: tx.gasLimit.toNumber(),
    to: tx.to,
    value: tx.value.toString(),
    data: tx.data
  });

  _parseEip712Signature(tx, transaction.slice(6), serializeEip712);

  return tx;
}

export function parseTransaction(rawTransaction: BytesLike): Transaction {
  const payload = arrayify(rawTransaction);

  // Ethereum Transactions
  if (payload[0] > 0x7f || payload[0] === 1 || payload[0] === 2) {
    return parse(payload);
  }

  // EIP 712
  if (payload[0] === 96) {
    return parseEip712(payload);
  }

  return logger.throwError(`unsupported transaction type: ${payload[0]}`, Logger.errors.UNSUPPORTED_OPERATION, {
    operation: 'parseTransaction',
    transactionType: payload[0]
  });
}

export function checkSignatureType(rawTransaction: BytesLike): SignatureType {
  const payload = arrayify(rawTransaction);

  // Ethereum Transactions
  if (payload[0] > 0x7f || payload[0] === 1 || payload[0] === 2) {
    return 'Ethereum';
  }

  // EIP 712
  if (payload[0] === 96) {
    return 'AcalaEip712';
  }

  return logger.throwError(`unsupported transaction type: ${payload[0]}`, Logger.errors.UNSUPPORTED_OPERATION, {
    operation: 'checkSignatureType',
    transactionType: payload[0]
  });
}
