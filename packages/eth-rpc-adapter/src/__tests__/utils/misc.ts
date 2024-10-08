import { BigNumber } from 'ethers';
import { BlockTagish, sleep } from '@acala-network/eth-providers';
import { Log, Provider , TransactionRequest } from '@ethersproject/abstract-provider';
import { expect } from 'vitest';
import { hexValue } from '@ethersproject/bytes';

import {
  LogHexified,
} from './consts';
import { eth_blockNumber, eth_estimateGas, eth_gasPrice, eth_getBlockByNumber, eth_getTransactionCount } from './eth-rpc-apis';

export const estimateGas = async (
  tx: TransactionRequest,
  blockTag?: BlockTagish
) => {
  const gasPrice = (await eth_gasPrice([])).data.result;
  const res = await eth_estimateGas([{ ...tx, gasPrice }, blockTag]);
  if (res.data.error) {
    throw new Error(res.data.error.message);
  }
  const gasLimit = res.data.result;

  return {
    gasPrice: BigNumber.from(gasPrice),
    gasLimit: BigNumber.from(gasLimit),
  };
};

export const hexilifyLog = (log: Log) => ({
  ...log,
  blockNumber: hexValue(parseInt(log.blockNumber as any)),
  transactionIndex: hexValue(parseInt(log.transactionIndex as any)),
  logIndex: hexValue(parseInt(log.logIndex as any)),
});

export const bigIntDiff = (x: bigint, y: bigint): bigint => {
  return x > y ? x - y : y - x;
};

export const getNonce = async (adder: string) =>
  (await eth_getTransactionCount([adder, 'pending'])).data.result;

export const getBlockHash = async (blockNum: number): Promise<string> =>
  (await eth_getBlockByNumber([blockNum, false])).data.result.hash;

export const getCurBlockHash = async (): Promise<string> => getBlockHash((await eth_blockNumber()).data.result);

export const expectLogsEqual = (a: LogHexified[], b: LogHexified[]): void => {
  expect(a.length).to.greaterThan(0);
  expect(a.length).to.equal(b.length);
  expect(
    a.every(({ transactionHash: t0, logIndex: l0 }) =>
      b.find(({ transactionHash: t1, logIndex: l1 }) => t0 === t1 && parseInt(l0) === parseInt(l1))
    )
  );
};

interface IndeterministicObj {
  blockHash?: string;
  transactionHash?: string;
  hash?: string;
}

const toDeterministicObj = <T extends IndeterministicObj>(obj: T) => {
  const res = { ...obj };
  delete res.blockHash;
  delete res.transactionHash;
  delete res.hash;

  return res;
};

export const toDeterministic = (data: any) => {
  const res = toDeterministicObj(data);
  if (res.logs) {
    res.logs = res.logs.map(toDeterministicObj);
  }

  return res;
};

export const waitForHeight = async (
  provider: Provider,
  height: number,
  timeout = 10000,
) => {
  const t = setTimeout(() => {
    throw new Error(`waitForHeight timeout after ${timeout}ms`);
  }, timeout);

  while (await provider.getBlockNumber() < height) {
    await sleep(100);
  }

  clearTimeout(t);
};
