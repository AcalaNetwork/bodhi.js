type Transaction = {
  chainId: number;
  nonce: number;
  gasLimit: number;
  to?: string;
  value: string;
  data: string;
};

export const createTransactionPayload = (tx: Transaction) => {
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
      salt: '0x0000000000000000000000000000000000000000000000000000000000000000'
    },
    message: {
      action: tx.to ? 'Call' : 'Create',
      to: tx.to || '0x0000000000000000000000000000000000000000',
      nonce: tx.nonce,
      tip: 2,
      data: tx.data,
      value: '0',
      gasLimit: tx.gasLimit,
      storageLimit: 20000,
      validUntil: 0
    }
  };
};
