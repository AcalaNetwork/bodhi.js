import { expect } from 'chai';
import { calcEthereumTransactionParams, calcSubstrateTransactionParams } from '../utils';

it('transactionHelper', async () => {
  const txFeePerGas = 199999946752n;
  const storageByteDeposit = 100000000000000n;

  const ethParams = calcEthereumTransactionParams({
    gasLimit: 2100001n,
    validUntil: 3601n,
    storageLimit: 64001n,
    txFeePerGas,
    storageByteDeposit
  });

  const subParams = calcSubstrateTransactionParams({
    txGasLimit: ethParams.txGasLimit,
    txGasPrice: ethParams.txGasPrice,
    txFeePerGas,
    storageByteDeposit
  });

  expect(subParams.gasLimit.toNumber()).gte(2100001);
  expect(subParams.storageLimit.toNumber()).gte(64001);
  expect(subParams.validUntil.toNumber()).gte(3601);
});
