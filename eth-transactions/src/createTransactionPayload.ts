import { hexlify } from '@ethersproject/bytes';
import { Eip712TransactionPayload } from './types';

export const createTransactionPayload = (tx: Eip712TransactionPayload) => {
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
      Transaction: [
        { name: 'action', type: 'string' },
        { name: 'to', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'tip', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'value', type: 'uint256' },
        { name: 'gasLimit', type: 'uint256' },
        { name: 'storageLimit', type: 'uint256' },
        { name: 'validUntil', type: 'uint256' }
      ]
    },
    primaryType: 'Transaction' as const,
    domain: {
      name: 'Acala EVM',
      version: '1',
      chainId: tx.chainId,
      salt: hexlify(tx.salt)
    },
    message: {
      action: tx.action || (tx.to ? 'Call' : 'Create'),
      to: tx.to || '0x0000000000000000000000000000000000000000',
      nonce: hexlify(tx.nonce),
      tip: hexlify(tx.tip || '0'),
      data: hexlify(tx.data || '0'),
      value: hexlify(tx.value || '0'),
      gasLimit: hexlify(tx.gasLimit || '0'),
      storageLimit: hexlify(tx.storageLimit || '0'),
      validUntil: hexlify(tx.validUntil || '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
    }
  };
};
