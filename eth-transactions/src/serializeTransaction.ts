import { getAddress } from '@ethersproject/address';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { hexConcat, SignatureLike, splitSignature, stripZeros } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import * as RLP from '@ethersproject/rlp';
import { serialize, UnsignedTransaction } from '@ethersproject/transactions';
import { MAX_UINT256 } from './createTransactionPayload';
import { logger } from './logger';
import { UnsignedEip712Transaction } from './types';

function formatNumber(value: BigNumberish, name: string): Uint8Array {
  const result = stripZeros(BigNumber.from(value).toHexString());
  if (result.length > 32) {
    logger.throwArgumentError('invalid length for ' + name, 'transaction:' + name, value);
  }
  return result;
}

// rlp([chainId, salt, nonce, gasLimit, storageLimit, to, value, data, validUntil, eip712sig])
export function serializeEip712(transaction: UnsignedEip712Transaction, signature?: SignatureLike) {
  const fields: any = [
    formatNumber(transaction.chainId || 0, 'chainId'),
    transaction.salt || '0x',
    formatNumber(transaction.nonce || 0, 'nonce'),
    formatNumber(transaction.gasLimit || 0, 'gasLimit'),
    formatNumber(transaction.storageLimit || 0, 'storageLimit'),
    transaction.to != null ? getAddress(transaction.to) : '0x',
    formatNumber(transaction.value || 0, 'value'),
    transaction.data || '0x',
    formatNumber(transaction.validUntil || MAX_UINT256, 'validUntil')
  ];

  if (signature) {
    const sig = splitSignature(signature);
    fields.push(formatNumber(sig.recoveryParam, 'recoveryParam'));
    fields.push(stripZeros(sig.r));
    fields.push(stripZeros(sig.s));
  }

  return hexConcat(['0x60', RLP.encode(fields)]);
}

export function serializeTransaction(transaction: UnsignedEip712Transaction, signature?: SignatureLike): string {
  // Ethereum Transactions
  if (transaction.type == null || transaction.type === 0 || transaction.type === 1 || transaction.type === 2) {
    return serialize(transaction, signature);
  }

  // eip712
  if (transaction.type === 96) {
    return serializeEip712(transaction as UnsignedEip712Transaction, signature);
  }

  return logger.throwError(`unsupported transaction type: ${transaction.type}`, Logger.errors.UNSUPPORTED_OPERATION, {
    operation: 'serializeTransaction',
    transactionType: transaction.type
  });
}
