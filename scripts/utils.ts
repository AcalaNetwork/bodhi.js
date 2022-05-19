import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MANDALA_RPC = 'https://tc7-eth.aca-dev.network';
const KARURA_TESTNET_RPC = 'https://karura-dev.aca-dev.network/eth/http';
const ACALA_TESTNET_RPC = 'https://acala-dev.aca-dev.network/eth/http';
const KARURA_MAINNET_RPC = 'https://eth-rpc-karura.aca-api.network';
const RPC_URL = process.env.RPC_URL || MANDALA_RPC;

console.log('RPC_URL: ', RPC_URL)

export const rpcGet =
  (method: string) =>
    (params: any): any =>
      axios.get(RPC_URL, {
        data: {
          id: 0,
          jsonrpc: '2.0',
          method,
          params
        }
      });

export const eth_call = rpcGet('eth_call');
export const eth_blockNumber = rpcGet('eth_blockNumber');
export const eth_getCode= rpcGet('eth_getCode');

export const sleep = (interval = 1000): Promise<null> =>
  new Promise((resolve) => setTimeout(() => resolve(null), interval));

export const runWithRetries = async <F extends AnyFunction>(
  fn: F,
  args: any[] = [],
  maxRetries: number = 1000,
  interval: number = 10000
): Promise<F extends (...args: any[]) => infer R ? R : never> => {
  let res;
  let tries = 0;

  while (!res && tries++ < maxRetries) {
    try {
      res = await fn(...args);
    } catch (e) {
      if (tries === maxRetries) throw e;
    }

    tries > 1 && console.log(`<runWithRetries> still waiting for result -- attemp # ${tries}/${maxRetries}`);

    await sleep(interval);
  }

  return res;
};