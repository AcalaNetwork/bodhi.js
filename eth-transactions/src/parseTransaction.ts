import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, BytesLike, hexlify, hexZeroPad, joinSignature } from '@ethersproject/bytes';
import { Zero } from '@ethersproject/constants';
import { keccak256 } from '@ethersproject/keccak256';
import { Logger } from '@ethersproject/logger';
import * as RLP from '@ethersproject/rlp';
import { parse, recoverAddress, Transaction, UnsignedTransaction } from '@ethersproject/transactions';
import { logger } from './logger';
import { serializeEip712 } from './serializeTransaction';
import { verifyTransaction } from './verifyTransaction';
import { transactionHash } from './transactionHash';

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

export function parseEip712(payload: Uint8Array): Transaction {
  const transaction = RLP.decode(payload.slice(1));

  if (transaction.length !== 6 && transaction.length !== 9) {
    logger.throwArgumentError('invalid component count for transaction type: 96', 'payload', hexlify(payload));
  }

  const tx: Transaction = {
    type: 96,
    chainId: handleNumber(transaction[0]).toNumber(),
    nonce: handleNumber(transaction[1]).toNumber(),
    gasLimit: handleNumber(transaction[2]),
    // @ts-ignore
    to: handleAddress(transaction[3]),
    value: handleNumber(transaction[4]),
    data: transaction[5]
  };

  // Unsigned EIP-712 Transaction
  if (transaction.length === 6) {
    return tx;
  }

  tx.hash = transactionHash({
    chainId: tx.chainId,
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
