import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, BytesLike, hexlify, hexZeroPad } from '@ethersproject/bytes';
import { Zero } from '@ethersproject/constants';
import { keccak256 } from '@ethersproject/keccak256';
import { Logger } from '@ethersproject/logger';
import * as RLP from '@ethersproject/rlp';
import { parse, recoverAddress, Transaction, UnsignedTransaction } from '@ethersproject/transactions';
import { logger } from './logger';
import { serializeEip712 } from './serializeTransaction';

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

function _parseEipSignature(
  tx: Transaction,
  fields: Array<string>,
  serialize: (tx: UnsignedTransaction) => string
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
    const digest = keccak256(serialize(tx));
    tx.from = recoverAddress(digest, { r: tx.r, s: tx.s, recoveryParam: tx.v });
  } catch (error) {
    console.log(error);
  }
}

export function parseEip712(payload: Uint8Array): Transaction {
  const transaction = RLP.decode(payload.slice(1));

  if (transaction.length !== 8 && transaction.length !== 11) {
    logger.throwArgumentError('invalid component count for transaction type: 1', 'payload', hexlify(payload));
  }

  const tx: Transaction = {
    type: 1,
    chainId: handleNumber(transaction[0]).toNumber(),
    nonce: handleNumber(transaction[1]).toNumber(),
    gasPrice: handleNumber(transaction[2]),
    gasLimit: handleNumber(transaction[3]),
    // @ts-ignore
    to: handleAddress(transaction[4]),
    value: handleNumber(transaction[5]),
    data: transaction[6]
  };

  // Unsigned EIP-712 Transaction
  if (transaction.length === 8) {
    return tx;
  }

  tx.hash = keccak256(payload);

  _parseEipSignature(tx, transaction.slice(8), serializeEip712);

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
