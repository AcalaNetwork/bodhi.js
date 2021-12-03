import { BigNumber, BigNumberish } from 'ethers';

type TxConsts = {
  storageByteDeposit: BigNumberish;
  txFeePerGas: BigNumberish;
};

const bigNumDiv = (x: BigNumber, y: BigNumber) => {
  const res = x.div(y);
  return res.mul(y) === x ? res : res.add(1);
};

export const calcEthereumTransactionParams = (
  data: {
    gasLimit: BigNumberish;
    storageLimit: BigNumberish;
    validUntil: BigNumberish;
  } & TxConsts
): {
  txGasPrice: BigNumber;
  txGasLimit: BigNumber;
} => {
  const gasLimit = BigNumber.from(data.gasLimit);
  const storageLimit = BigNumber.from(data.storageLimit);
  const validUntil = BigNumber.from(data.validUntil);
  const storageByteDeposit = BigNumber.from(data.storageByteDeposit);
  const txFeePerGas = BigNumber.from(data.txFeePerGas);

  const blockPeriod = validUntil.div(30);
  const storageEntryLimit = storageLimit.div(64);
  const storageEntryDeposit = storageByteDeposit.mul(64);
  const txGasPrice = txFeePerGas.add(blockPeriod.shl(16)).add(storageEntryLimit);

  const txGasLimit = storageEntryLimit.mul(storageEntryDeposit).div(txFeePerGas).add(gasLimit);

  return {
    txGasPrice,
    txGasLimit
  };
};

export const calcSubstrateTransactionParams = (
  data: {
    txGasPrice: BigNumberish;
    txGasLimit: BigNumberish;
  } & TxConsts
): {
  gasLimit: BigNumber;
  storageLimit: BigNumber;
  validUntil: BigNumber;
} => {
  const txGasPrice = BigNumber.from(data.txGasPrice);
  const txGasLimit = BigNumber.from(data.txGasLimit);
  const storageByteDeposit = BigNumber.from(data.storageByteDeposit);
  const txFeePerGas = BigNumber.from(data.txFeePerGas);

  const storageEntryLimit = txGasPrice.and(0xffff);
  const blockPeriod = txGasPrice.sub(storageEntryLimit).sub(txFeePerGas).shr(16);
  const storageLimit = storageEntryLimit.mul(64);
  const validUntil = blockPeriod.mul(30);
  const storageEntryDeposit = storageByteDeposit.mul(64);
  const gasLimit = txGasLimit.sub(storageEntryDeposit.div(txFeePerGas).mul(storageEntryLimit));

  return {
    gasLimit,
    storageLimit,
    validUntil
  };
};
