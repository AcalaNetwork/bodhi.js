import { BigNumber, ContractFactory, Signer } from 'ethers';
import { BlockTagish, sleep } from '@acala-network/eth-providers';
import { Log, Provider, TransactionRequest } from '@ethersproject/abstract-provider';
import { expect } from 'vitest';
import { hexValue } from '@ethersproject/bytes';
import { parseEther } from 'ethers/lib/utils';
import axios from 'axios';

import { ERC20_ABI, ERC20_BYTECODE, GASMONSTER_ABI, GASMONSTER_BYTECODE, LogHexified } from './consts';
import { JsonRpcError } from '../../server';

export const NODE_RPC_URL = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';
export const KARURA_ETH_RPC_URL = process.env.KARURA_ETH_RPC_URL || 'http://127.0.0.1:8546';
export const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
export const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:8545';
export const SUBQL_URL = process.env.SUBQL_URL || 'http://127.0.0.1:3001';

export const rpcGet =
  <R = any>(method: string, url: string = RPC_URL) =>
    (params: any[] = []) =>
      axios.get<any, R>(url, {
        data: {
          id: 0,
          jsonrpc: '2.0',
          method,
          params,
        },
      });

export const hexilifyLog = (log: Log) => ({
  ...log,
  blockNumber: hexValue(parseInt(log.blockNumber as any)),
  transactionIndex: hexValue(parseInt(log.transactionIndex as any)),
  logIndex: hexValue(parseInt(log.logIndex as any)),
});

/* ---------- local rpc methods ---------- */
export const eth_call = rpcGet('eth_call');
export const eth_blockNumber = rpcGet('eth_blockNumber');
export const eth_getBlockByNumber = rpcGet('eth_getBlockByNumber');
export const eth_getTransactionReceipt = rpcGet('eth_getTransactionReceipt');
export const eth_getLogs = rpcGet<{ data: { result: LogHexified[]; error?: JsonRpcError } }>('eth_getLogs');
export const eth_getTransactionByHash = rpcGet('eth_getTransactionByHash');
export const eth_accounts = rpcGet('eth_accounts');
export const eth_sendRawTransaction = rpcGet('eth_sendRawTransaction');
export const eth_getTransactionCount = rpcGet('eth_getTransactionCount');
export const eth_getBalance = rpcGet('eth_getBalance');
export const eth_chainId = rpcGet('eth_chainId');
export const eth_gasPrice = rpcGet('eth_gasPrice');
export const eth_estimateGas = rpcGet('eth_estimateGas');
export const eth_getEthGas = rpcGet('eth_getEthGas');
export const eth_getCode = rpcGet('eth_getCode');
export const eth_getEthResources = rpcGet('eth_getEthResources');
export const net_runtimeVersion = rpcGet('net_runtimeVersion');
export const eth_isBlockFinalized = rpcGet('eth_isBlockFinalized');
export const eth_newFilter = rpcGet('eth_newFilter');
export const eth_newBlockFilter = rpcGet('eth_newBlockFilter');
export const eth_getFilterChanges = rpcGet('eth_getFilterChanges');
export const eth_getFilterLogs = rpcGet<{
  data: {
    result: LogHexified[];
    error?: JsonRpcError;
  };
}>('eth_getFilterLogs');
export const eth_uninstallFilter = rpcGet('eth_uninstallFilter');
export const net_listening = rpcGet('net_listening');

/* ---------- karura mainnet rpc methods ---------- */
export const eth_blockNumber_karura = rpcGet('eth_blockNumber', KARURA_ETH_RPC_URL);
export const eth_getTransactionReceipt_karura = rpcGet('eth_getTransactionReceipt', KARURA_ETH_RPC_URL);
export const eth_getTransactionByHash_karura = rpcGet('eth_getTransactionByHash', KARURA_ETH_RPC_URL);
export const eth_getBlockByNumber_karura = rpcGet('eth_getBlockByNumber', KARURA_ETH_RPC_URL);
export const eth_getStorageAt_karura = rpcGet('eth_getStorageAt', KARURA_ETH_RPC_URL);

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

export const deployErc20 = async (wallet: Signer) => {
  const Token = new ContractFactory(ERC20_ABI, ERC20_BYTECODE, wallet);
  const token = await Token.deploy(parseEther('1000000000'), 'TestToken', 18, 'TT');
  await token.deployed();

  return token;
};

export const deployGasMonster = async (wallet: Signer) => {
  const GM = new ContractFactory(GASMONSTER_ABI, GASMONSTER_BYTECODE, wallet);
  const gm = await GM.deploy();
  await gm.deployed();

  return gm;
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
