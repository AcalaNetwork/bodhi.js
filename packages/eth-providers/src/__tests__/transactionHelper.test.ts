import { calcEthereumTransactionParams, calcSubstrateTransactionParams } from '../utils';
import { expect, it } from 'vitest';

it('transactionHelper', async () => {
  const txFeePerGas = 199999946752n;
  const storageByteDeposit = 100000000000000n;

  const ethParams = calcEthereumTransactionParams({
    gasLimit: 2100001n,
    validUntil: 3601n,
    storageLimit: 64001n,
    txFeePerGas,
    storageByteDeposit,
  });

  const subParams = calcSubstrateTransactionParams({
    txGasLimit: ethParams.txGasLimit,
    txGasPrice: ethParams.txGasPrice,
    txFeePerGas,
    storageByteDeposit,
  });

  expect(subParams.gasLimit.toNumber()).eq(2100001);
  expect(subParams.storageLimit.toNumber()).eq(64064);
  expect(subParams.validUntil.toNumber()).eq(3630);
});
