import { calcEthereumTransactionParams } from '@acala-network/eth-providers';

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

export const getOverrides = () => {
  const params = calcEthereumTransactionParams({
    gasLimit: '9100001',
    validUntil: '360001',
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });

  return {
    gasLimit: params.txGasLimit,
    gasPrice: params.txGasPrice
  };
};
