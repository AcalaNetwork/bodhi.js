import { getAddress } from '@ethersproject/address';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { hexConcat, SignatureLike, splitSignature, stripZeros } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import * as RLP from '@ethersproject/rlp';
import { serialize, UnsignedTransaction } from '@ethersproject/transactions';
import { logger } from './logger';

function formatNumber(value: BigNumberish, name: string): Uint8Array {
  const result = stripZeros(BigNumber.from(value).toHexString());
  if (result.length > 32) {
    logger.throwArgumentError('invalid length for ' + name, 'transaction:' + name, value);
  }
  return result;
}

// rlp([chainId, nonce, gasLimit, to, value, data, eip712sig])
export function serializeEip712(transaction: UnsignedTransaction, signature?: SignatureLike) {
  const fields: any = [
    formatNumber(transaction.chainId || 0, 'chainId'),
    formatNumber(transaction.nonce || 0, 'nonce'),
    formatNumber(transaction.gasLimit || 0, 'gasLimit'),
    transaction.to != null ? getAddress(transaction.to) : '0x',
    formatNumber(transaction.value || 0, 'value'),
    transaction.data || '0x'
  ];

  if (signature) {
    const sig = splitSignature(signature);
    fields.push(formatNumber(sig.recoveryParam, 'recoveryParam'));
    fields.push(stripZeros(sig.r));
    fields.push(stripZeros(sig.s));
  }

  return hexConcat(['0x60', RLP.encode(fields)]);
}

export function serializeTransaction(transaction: UnsignedTransaction, signature?: SignatureLike): string {
  // Ethereum Transactions
  if (transaction.type == null || transaction.type === 0 || transaction.type === 1 || transaction.type === 2) {
    return serialize(transaction, signature);
  }

  // eip712
  if (transaction.type === 96) {
    return serializeEip712(transaction, signature);
  }

  return logger.throwError(`unsupported transaction type: ${transaction.type}`, Logger.errors.UNSUPPORTED_OPERATION, {
    operation: 'serializeTransaction',
    transactionType: transaction.type
  });
}
