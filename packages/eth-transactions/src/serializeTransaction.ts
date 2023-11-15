import * as RLP from '@ethersproject/rlp';
import { AccessListish, accessListify, serialize } from '@ethersproject/transactions';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Logger } from '@ethersproject/logger';
import { MAX_UINT256 } from './createTransactionPayload';
import { SignatureLike, hexConcat, splitSignature, stripZeros } from '@ethersproject/bytes';
import { UnsignedAcalaEvmTX } from './types';
import { getAddress } from '@ethersproject/address';
import { logger } from './logger';

function formatAccessList(value: AccessListish): Array<[string, Array<string>]> {
  return accessListify(value).map(set => [set.address, set.storageKeys]);
}

function formatNumber(value: BigNumberish, name: string): Uint8Array {
  const result = stripZeros(BigNumber.from(value).toHexString());
  if (result.length > 32) {
    logger.throwArgumentError('invalid length for ' + name, 'transaction:' + name, value);
  }
  return result;
}

// rlp([chainId, salt, nonce, gasLimit, storageLimit, to, value, data, validUntil, tip, accessList, eip712sig])
export function serializeEip712(transaction: UnsignedAcalaEvmTX, signature?: SignatureLike): string {
  const fields: any = [
    formatNumber(transaction.chainId || 0, 'chainId'),
    transaction.salt || '0x',
    formatNumber(transaction.nonce || 0, 'nonce'),
    formatNumber(transaction.gasLimit || 0, 'gasLimit'),
    formatNumber(transaction.storageLimit || 0, 'storageLimit'),
    transaction.to === null || transaction.to === undefined ? '0x' : getAddress(transaction.to),
    formatNumber(transaction.value || 0, 'value'),
    transaction.data || '0x',
    formatNumber(transaction.validUntil || MAX_UINT256, 'validUntil'),
    formatNumber(transaction.tip || 0, 'tip'),
    formatAccessList(transaction.accessList || []),
  ];

  if (signature) {
    const sig = splitSignature(signature);
    fields.push(formatNumber(sig.recoveryParam, 'recoveryParam'));
    fields.push(stripZeros(sig.r));
    fields.push(stripZeros(sig.s));
  }

  return hexConcat(['0x60', RLP.encode(fields)]);
}

export function serializeTransaction(transaction: UnsignedAcalaEvmTX, signature?: SignatureLike): string {
  // Ethereum Transactions
  if (
    transaction.type === null ||
    transaction.type === undefined ||
    transaction.type === 0 ||
    transaction.type === 1 ||
    transaction.type === 2
  ) {
    return serialize(transaction, signature);
  }

  // eip712
  if (transaction.type === 96) {
    return serializeEip712(transaction as UnsignedAcalaEvmTX, signature);
  }

  return logger.throwError(`unsupported transaction type: ${transaction.type}`, Logger.errors.UNSUPPORTED_OPERATION, {
    operation: 'serializeTransaction',
    transactionType: transaction.type,
  });
}
