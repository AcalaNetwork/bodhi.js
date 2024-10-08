import { BigNumber, BigNumberish, Transaction } from 'ethers';
import { Deferrable, resolveProperties } from '@ethersproject/properties';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { accessListify } from '@ethersproject/transactions';
import { hexlify } from '@ethersproject/bytes';

import { GAS_LIMIT_CHUNK, GAS_MASK, MAX_GAS_LIMIT_CC, ONE_HUNDRED_GWEI, STORAGE_MASK, TEN_GWEI, U32_MAX } from '../consts';
import { ethToNativeDecimal } from './utils';
import { formatter } from './receiptHelper';

export type TxRequestWithGas = TransactionRequest & { gas?: BigNumberish };

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
    txGasLimit,
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
    validUntil,
  };
};

export const getTransactionRequest = async (
  txRequest: Deferrable<TxRequestWithGas>
): Promise<Partial<Transaction>> => {
  const req = await resolveProperties(txRequest);
  const tx: Partial<Transaction> = {};

  if (!req.gasLimit && req.gas !== undefined) {
    req.gasLimit = req.gas;
  }

  ['from', 'to', 'type'].forEach(key => {
    tx[key] = req[key];
  });

  ['gasLimit', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'value'].forEach(key => {
    tx[key] = req[key] && BigNumber.from(req[key]);
  });

  tx.accessList = req.accessList && accessListify(req.accessList);

  tx.data = req.data && hexlify(req.data);

  return formatter.transactionRequest(tx);
};

export const encodeGasLimit = (
  txFee: BigNumber,
  gasPrice: BigNumber,
  gasLimit: BigNumber,
  usedStorage: BigNumber,
  isTokenTransfer = false,
): BigNumber => {
  const rawEthGasLimit = txFee.div(gasPrice);
  const encodedStorageLimit = usedStorage.gt(0)
    ? Math.ceil(Math.log2(usedStorage.toNumber()))
    : 0;

  let encodedGasLimit = gasLimit.div(GAS_LIMIT_CHUNK).add(1);
  if (isTokenTransfer) {
    // for token transfer, need to make sure when metamask 1.5X gasLimit, it won't affect cc
    // bbb => b(b+1)0
    encodedGasLimit = encodedGasLimit.div(10).add(1).mul(10);
  }

  const aaaa00000 = rawEthGasLimit.gt(GAS_MASK)
    ? rawEthGasLimit.div(GAS_MASK).mul(GAS_MASK)
    : BigNumber.from(GAS_MASK);
  const bbb00 = encodedGasLimit.mul(STORAGE_MASK);
  const cc = encodedStorageLimit;

  return aaaa00000.add(bbb00).add(cc); // aaaabbbcc
};

export const decodeEthGas = ({
  gasPrice,
  gasLimit,
}: {
  gasPrice: BigNumber;
  gasLimit: BigNumber;
}) => {
  const bbbcc = gasLimit.mod(GAS_MASK);
  const encodedGasLimit = bbbcc.div(STORAGE_MASK); // bbb
  const encodedStorageLimit = bbbcc.mod(STORAGE_MASK); // cc

  let tip = 0n;
  const tipNumber = gasPrice.div(TEN_GWEI).sub(10);
  if (tipNumber.gt(0)) {
    gasPrice = gasPrice.sub(tipNumber.mul(TEN_GWEI));
    const ethTip = gasPrice.mul(gasLimit).mul(tipNumber).div(10);
    tip = ethToNativeDecimal(ethTip).toBigInt();
  }

  let validUntil = gasPrice.sub(ONE_HUNDRED_GWEI).toBigInt();
  if (validUntil > U32_MAX) {
    validUntil = U32_MAX;
  }
  const substrateGasLimit = encodedGasLimit.mul(GAS_LIMIT_CHUNK).toBigInt();
  const storageLimit = BigNumber.from(2)
    .pow(
      encodedStorageLimit.gt(MAX_GAS_LIMIT_CC)
        ? MAX_GAS_LIMIT_CC
        : encodedStorageLimit
    )
    .toBigInt();

  return {
    gasLimit: substrateGasLimit,
    storageLimit,
    tip,
    validUntil,
  };
};
