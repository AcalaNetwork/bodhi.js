import axios from 'axios';

export const PUBLIC_MANDALA_RPC_URL = process.env.PUBLIC_MANDALA_RPC_URL || 'http://127.0.0.1:8546';
export const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
export const SUBQL_URL = process.env.SUBQL_URL || 'http://127.0.0.1:3001';

export const rpcGet =
  (method: string, url: string = RPC_URL) =>
  (params: any[] = []): any =>
    axios.get(url, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method,
        params
      }
    });

export const bigIntDiff = (x: bigint, y: bigint): bigint => {
  return x > y ? x - y : y - x;
};
