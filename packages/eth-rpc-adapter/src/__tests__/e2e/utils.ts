import axios from 'axios';

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

export const bigIntDiff = (x: bigint, y: bigint): bigint => {
  return x > y ? x - y : y - x;
};
