import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const MANDALA_RPC = 'https://tc7-eth.aca-dev.network';
export const MANDALA_RPC_WS = 'wss://tc7-eth.aca-dev.network/ws';
export const MANDALA_RPC_SUBQL = 'https://mandala-eth-rpc-adapter.thechaindata.com/public';
export const MANDALA_RPC_WS_SUBQL = 'wss://mandala-eth-rpc-adapter.thechaindata.com/public-ws';
export const KARURA_TESTNET_RPC = 'https://karura-dev.aca-dev.network/eth/http';
export const ACALA_TESTNET_RPC = 'https://acala-dev.aca-dev.network/eth/http';
export const KARURA_MAINNET_RPC = 'https://eth-rpc-karura.aca-api.network';
export const RPC_URL = process.env.RPC_URL || MANDALA_RPC;

// console.log('RPC_URL: ', RPC_URL)

export const rpcGet =
  (method: string, url?: string = RPC_URL) =>
  (params: any = []): any =>
    axios.get(url, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method,
        params
      }
    });

export const eth_call = rpcGet('eth_call');
export const eth_blockNumber = rpcGet('eth_blockNumber');
export const eth_getCode = rpcGet('eth_getCode');

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

const TIME_OUT = 20000; // 20s
export const runWithTiming = async <F extends AnyFunction>(
  fn: F
): Promise<{
  time: number;
  res: F extends (...args: any[]) => infer R ? R | string : any;
}> => {
  let res = null;
  const t0 = performance.now();
  let runningErr = false;
  let timedout = false;

  try {
    res = await Promise.race([fn(), sleep(TIME_OUT)]);

    // fn should always return something
    if (res === null) {
      res = `error in runWithTiming: timeout after ${TIME_OUT / 1000} seconds`;
      timedout = true;
    }
  } catch (e) {
    res = `error in runWithTiming: ${(e as any).toString()}`;
    runningErr = true;
  }

  const t1 = performance.now();
  const time = runningErr ? -1 : timedout ? -999 : t1 - t0;

  return {
    res,
    time
  };
};
