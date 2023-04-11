import { BigNumber, BigNumberish, Transaction } from 'ethers';
import { Deferrable, resolveProperties } from '@ethersproject/properties';
import { GAS_LIMIT_CHUNK, GAS_MASK, STORAGE_MASK } from '../consts';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { accessListify } from '@ethersproject/transactions';
import { formatter } from './transactionReceiptHelper';
import { hexlify } from '@ethersproject/bytes';

type TxConsts = {
  storageByteDeposit: BigNumberish;
  txFeePerGas: BigNumberish;
};

const divRoundUp = (x: BigNumber, y: BigNumber): BigNumber => {
  const mod = x.mod(y);
  const div = x.div(y);

  return div.add(mod.gt(0) ? 1 : 0);
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

  const blockPeriod = divRoundUp(validUntil, BigNumber.from(30));
  const storageEntryLimit = divRoundUp(storageLimit, BigNumber.from(64));
  const storageEntryDeposit = storageByteDeposit.mul(64);
  const txGasPrice = txFeePerGas.add(blockPeriod.shl(16)).add(storageEntryLimit);
  const txGasLimit = storageEntryDeposit.div(txFeePerGas).mul(storageEntryLimit).add(gasLimit);

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

export const getTransactionRequest = async (
  transaction: Deferrable<TransactionRequest>
): Promise<Partial<Transaction>> => {
  const values: any = await transaction;

  const tx: any = {};

  ['from', 'to'].forEach((key) => {
    if (values[key] === null || values[key] === undefined) {
      return;
    }
    tx[key] = Promise.resolve(values[key]).then((v) => (v ? v : null));
  });

  ['gasLimit', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'value'].forEach((key) => {
    if (values[key] === null || values[key] === undefined) {
      return;
    }
    tx[key] = Promise.resolve(values[key]).then((v) => (v ? BigNumber.from(v) : null));
  });

  ['type'].forEach((key) => {
    if (values[key] === null || values[key] === undefined) {
      return;
    }
    tx[key] = Promise.resolve(values[key]).then((v) => (v !== null || v !== undefined ? v : null));
  });

  if (values.accessList) {
    tx.accessList = accessListify(values.accessList);
  }

  ['data'].forEach((key) => {
    if (values[key] === null || values[key] === undefined) {
      return;
    }
    tx[key] = Promise.resolve(values[key]).then((v) => (v ? hexlify(v) : null));
  });

  return formatter.transactionRequest(await resolveProperties(tx));
};

export const encodeGasLimit = (
  txFee: BigNumber,
  gasPrice: BigNumber,
  gasLimit: BigNumber,
  usedStorage: BigNumber
): BigNumber => {
  const rawEthGasLimit = txFee.div(gasPrice);
  const encodedGasLimit = gasLimit.div(GAS_LIMIT_CHUNK).add(1);
  const encodedStorageLimit = usedStorage.gt(0) ? Math.ceil(Math.log2(usedStorage.toNumber())) : 0;

  const aaaa00000 = rawEthGasLimit.div(GAS_MASK).mul(GAS_MASK);
  const bbb00 = encodedGasLimit.mul(STORAGE_MASK);
  const cc = encodedStorageLimit;
  return aaaa00000.add(bbb00).add(cc); // aaaabbbcc
};
