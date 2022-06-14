import { BigNumber } from '@ethersproject/bignumber';
import { hexlify } from '@ethersproject/bytes';
import { logger } from './logger';
import { AcalaEvmTXPayload } from './types';
import { accessListify } from '@ethersproject/transactions';

export const MAX_UINT256 = '0xffffffff';

// eslint-disable-next-line
export const createTransactionPayload = (tx: AcalaEvmTXPayload) => {
  if (!tx.salt) {
    return logger.throwError('eip712tx missing salt');
  }

  if (!tx.chainId) {
    return logger.throwError('eip712tx missing chainId');
  }

  return {
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string'
        },
        {
          name: 'version',
          type: 'string'
        },
        {
          name: 'chainId',
          type: 'uint256'
        },
        {
          name: 'salt',
          type: 'bytes32'
        }
      ],
      AccessList: [
        { name: 'address', type: 'address' },
        { name: 'storageKeys', type: 'uint256[]' }
      ],
      Transaction: [
        { name: 'action', type: 'string' },
        { name: 'to', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'tip', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'value', type: 'uint256' },
        { name: 'gasLimit', type: 'uint256' },
        { name: 'storageLimit', type: 'uint256' },
        { name: 'accessList', type: 'AccessList[]' },
        { name: 'validUntil', type: 'uint256' }
      ]
    },
    primaryType: 'Transaction' as const,
    domain: {
      name: 'Acala EVM',
      version: '1',
      chainId: tx.chainId,
      salt: hexlify(tx.salt || '0x')
    },
    message: {
      action: tx.action || (tx.to ? 'Call' : 'Create'),
      to: tx.to || '0x0000000000000000000000000000000000000000',
      nonce: BigNumber.from(tx.nonce).toString(),
      tip: BigNumber.from(tx.tip || 0).toString(),
      data: hexlify(tx.data || '0x'),
      value: BigNumber.from(tx.value || 0).toString(),
      gasLimit: BigNumber.from(tx.gasLimit || 0).toString(),
      storageLimit: BigNumber.from(tx.storageLimit || 0).toString(),
      accessList: tx.accessList ? accessListify(tx.accessList) : [],
      validUntil: BigNumber.from(tx.validUntil || MAX_UINT256).toString()
    }
  };
};
