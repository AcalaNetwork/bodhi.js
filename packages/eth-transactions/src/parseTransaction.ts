import * as RLP from '@ethersproject/rlp';
import { AcalaEvmTX, UnsignedAcalaEvmTX } from './types';
import { BigNumber } from '@ethersproject/bignumber';
import { BytesLike, arrayify, hexZeroPad, hexlify, joinSignature } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { Zero } from '@ethersproject/constants';
import { accessListify, parse } from '@ethersproject/transactions';
import { getAddress } from '@ethersproject/address';
import { logger } from './logger';
import { serializeEip712 } from './serializeTransaction';
import { transactionHash } from './transactionHash';
import { verifyTransaction } from './verifyTransaction';

const EIP712_PARAMS_LENGTH = 10;

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
  tx: AcalaEvmTX,
  fields: Array<string>,
  _serialize: (tx: UnsignedAcalaEvmTX) => string
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

  tx.from = verifyTransaction(
    {
      chainId: tx.chainId,
      salt: tx.salt,
      nonce: tx.nonce,
      gasLimit: tx.gasLimit,
      storageLimit: tx.storageLimit,
      to: tx.to,
      value: tx.value,
      data: tx.data,
      validUntil: tx.validUntil,
      tip: tx.tip,
      accessList: tx.accessList
    },
    joinSignature({ r: tx.r, s: tx.s, v: tx.v })
  );
}

export type SignatureType = 'Ethereum' | 'AcalaEip712' | 'Eip1559';

// rlp([chainId, salt, nonce, gasLimit, storageLimit, to, value, data, validUntil, tip, accessList, eip712sig])
export function parseEip712(payload: Uint8Array): AcalaEvmTX {
  const transaction = RLP.decode(payload.slice(1));

  if (transaction.length !== EIP712_PARAMS_LENGTH + 1 && transaction.length !== EIP712_PARAMS_LENGTH + 4) {
    logger.throwArgumentError('invalid component count for transaction type: 96', 'payload', hexlify(payload));
  }

  const tx: AcalaEvmTX = {
    type: 96,
    chainId: handleNumber(transaction[0]).toNumber(),
    salt: transaction[1],
    nonce: handleNumber(transaction[2]).toNumber(),
    gasLimit: handleNumber(transaction[3]),
    storageLimit: handleNumber(transaction[4]),
    to: handleAddress(transaction[5]),
    value: handleNumber(transaction[6]),
    data: transaction[7],
    validUntil: handleNumber(transaction[8]),
    tip: handleNumber(transaction[9]),
    accessList: accessListify(transaction[10])
  };

  // Unsigned EIP-712 Transaction
  if (transaction.length === EIP712_PARAMS_LENGTH + 1) {
    return tx;
  }

  tx.hash = transactionHash({
    chainId: tx.chainId,
    salt: tx.salt,
    storageLimit: tx.storageLimit,
    validUntil: tx.validUntil,
    nonce: tx.nonce,
    gasLimit: tx.gasLimit,
    to: tx.to,
    value: tx.value,
    data: tx.data,
    tip: tx.tip,
    accessList: tx.accessList
  });

  _parseEip712Signature(tx, transaction.slice(EIP712_PARAMS_LENGTH + 1), serializeEip712);

  return tx;
}

export function parseTransaction(rawTransaction: BytesLike): AcalaEvmTX {
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

  if (payload[0] > 0x7f || payload[0] === 1) return 'Ethereum'; // Legacy and EIP-155
  if (payload[0] === 2) return 'Eip1559'; // EIP-1559
  if (payload[0] === 96) return 'AcalaEip712'; // Acala EIP-712

  return logger.throwError(`unsupported transaction type: ${payload[0]}`, Logger.errors.UNSUPPORTED_OPERATION, {
    operation: 'checkSignatureType',
    transactionType: payload[0]
  });
}
