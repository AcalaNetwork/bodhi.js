import axios from 'axios';

import {
  ETH_RPC_URL,
  LogHexified,
} from './consts';
import { JsonRpcError } from '../../server';

export const rpcGet =
  <R = any>(method: string, url: string = ETH_RPC_URL) =>
    (params: any[] = []) =>
      axios.get<any, R>(url, {
        data: {
          id: 0,
          jsonrpc: '2.0',
          method,
          params,
        },
      });

export const eth_call = rpcGet('eth_call');
export const eth_blockNumber = rpcGet('eth_blockNumber');
export const eth_getBlockByNumber = rpcGet('eth_getBlockByNumber');
export const eth_getBlockByHash = rpcGet('eth_getBlockByHash');
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
export const eth_getStorageAt = rpcGet('eth_getStorageAt', ETH_RPC_URL);
