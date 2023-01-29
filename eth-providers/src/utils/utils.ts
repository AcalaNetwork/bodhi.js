import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { BigNumber } from '@ethersproject/bignumber';
import { Extrinsic } from '@polkadot/types/interfaces';
import { AnyFunction } from '@polkadot/types/types';
import { hexToU8a } from '@polkadot/util';
import { BlockTagish, CallInfo, Eip1898BlockTag } from '../base-provider';
import { CacheInspect } from './BlockCache';
import { _Metadata } from './gqlTypes';

export interface EthCallTimingResult {
  gasPriceTime: number;
  estimateGasTime: number;
  getBlockTime: number;
  getFullBlockTime: number;
}

export interface HealthResult {
  isHealthy: boolean;
  isSubqlOK: boolean;
  isCacheOK: boolean;
  isRPCOK: boolean;
  msg: string[];
  moreInfo: {
    // cache
    cachedBlocksCount: number;
    maxCachedBlocksCount: number;
    // subql
    lastProcessedHeight: number;
    targetHeight: number;
    curFinalizedHeight: number;
    lastProcessedTimestamp: number;
    curTimestamp: number;
    idleSeconds: number;
    idleBlocks: number;
    indexerHealthy: boolean;
    // RPC
    ethCallTiming: EthCallTimingResult;
    // listeners
    listenersCount: {
      newHead: number;
      logs: number;
    };
  };
}

export interface HealthData {
  indexerMeta?: _Metadata;
  cacheInfo?: CacheInspect;
  curFinalizedHeight: number;
  ethCallTiming: EthCallTimingResult;
  listenersCount: {
    newHead: number;
    logs: number;
  };
}

export const sleep = (interval = 1000): Promise<null> =>
  new Promise((resolve) => setTimeout(() => resolve(null), interval));

export const promiseWithTimeout = <T = any>(value: any, interval = 1000): Promise<T> => {
  let timeoutHandle: any;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(() => resolve(null), interval);
  });

  return Promise.race([value, timeoutPromise])
    .then((result) => {
      clearTimeout(timeoutHandle);
      return result;
    })
    .catch((error) => {
      clearTimeout(timeoutHandle);
      return Promise.reject(error);
    });
};

export const isEvmExtrinsic = (e: Extrinsic): boolean => e.method.section.toLowerCase() === 'evm';
export const isEvmEvent = (e: FrameSystemEventRecord): boolean =>
  e.event.section.toLowerCase() === 'evm' &&
  ['Created', 'Executed', 'CreatedFailed', 'ExecutedFailed'].includes(e.event.method);
export const isOrphanEvmEvent = (e: FrameSystemEventRecord): boolean => isEvmEvent(e) && !e.phase.isApplyExtrinsic;

export const runWithRetries = async <F extends AnyFunction>(
  fn: F,
  args: any[] = [],
  maxRetries: number = 20,
  interval: number = 1000
): Promise<F extends (...args: any[]) => infer R ? R : never> => {
  let res;
  let tries = 0;

  while (!res && tries++ < maxRetries) {
    try {
      res = await fn(...args);
    } catch (e) {
      if (tries === maxRetries) throw e;
    }

    if ((tries === 1 || tries % 10 === 0) && !res) {
      console.log(`<local mode runWithRetries> still waiting for result # ${tries}/${maxRetries}`);
    }

    await sleep(interval);
  }

  return res;
};

export const getHealthResult = ({
  indexerMeta,
  cacheInfo,
  curFinalizedHeight,
  ethCallTiming,
  listenersCount
}: HealthData): HealthResult => {
  const MAX_IDLE_TIME = 30 * 60; // half an hour
  const MAX_IDLE_BLOCKS = 50; // ~10 minutes
  const ETH_CALL_MAX_TIME = 5000; // 5 seconds

  let isHealthy = true;
  let isSubqlOK = true;
  let isCacheOK = true;
  let isRPCOK = true;
  const msg = [];

  /* --------------- cache --------------- */
  const maxCachedBlocks = cacheInfo?.maxCachedBlocks || 0;
  let cachedBlocksCount = 0;
  if (!cacheInfo) {
    msg.push('no cache running!');
    isHealthy = false;
    isCacheOK = false;
  } else {
    cachedBlocksCount = cacheInfo.cachedBlocksCount;

    // only care if at least 1000
    if (cachedBlocksCount > Math.max(1000, Math.floor(maxCachedBlocks * 1.3))) {
      msg.push(`cached blocks size is bigger than expected: ${cachedBlocksCount}, expect at most ~${maxCachedBlocks}`);
      isHealthy = false;
      isCacheOK = false;
    }
  }

  /* --------------- subql --------------- */
  // lastProcessedTimestamp seems to be delayed for a little bit, but it's OK
  const lastProcessedTimestamp = parseInt(indexerMeta?.lastProcessedTimestamp || '0');
  const lastProcessedHeight = indexerMeta?.lastProcessedHeight || 0;
  const targetHeight = indexerMeta?.targetHeight || 0;
  const indexerHealthy = indexerMeta?.indexerHealthy || false;

  const curTimestamp = Date.now();
  const idleTime = (curTimestamp - lastProcessedTimestamp) / 1000;
  const idleBlocks = curFinalizedHeight - Number(lastProcessedHeight);

  if (!indexerMeta) {
    msg.push('no indexer is running!');
    isHealthy = false;
    isSubqlOK = false;
  } else {
    if (idleTime > MAX_IDLE_TIME) {
      const idleMinutes = Math.floor(idleTime / 60);
      const idleHours = (idleTime / 3600).toFixed(1);
      msg.push(`indexer already idle for: ${idleTime} seconds = ${idleMinutes} minutes = ${idleHours} hours`);
      isHealthy = false;
      isSubqlOK = false;
    }

    if (idleBlocks > MAX_IDLE_BLOCKS) {
      msg.push(`indexer already idle for: ${idleBlocks} blocks`);
      isHealthy = false;
      isSubqlOK = false;
    }

    if (idleBlocks < -MAX_IDLE_BLOCKS) {
      msg.push(`node production already idle for: ${-idleBlocks} blocks`);
      isHealthy = false;
    }
  }

  /* --------------- RPC --------------- */
  Object.values(ethCallTiming).forEach((t) => {
    if (t > ETH_CALL_MAX_TIME) {
      msg.push(
        `an RPC is getting slow, takes more than ${
          ETH_CALL_MAX_TIME / 1000
        } seconds to complete internally. All timings: ${JSON.stringify(ethCallTiming)}`
      );
      isHealthy = false;
      isRPCOK = false;
    }

    if (t === -1) {
      msg.push(`an RPC is getting running errors. All timings: ${JSON.stringify(ethCallTiming)}`);
      isHealthy = false;
      isRPCOK = false;
    }

    if (t === -999) {
      msg.push(`an RPC is getting timeouts. All timings: ${JSON.stringify(ethCallTiming)}`);
      isHealthy = false;
      isRPCOK = false;
    }
  });

  /* --------------- result --------------- */
  return {
    isHealthy,
    isSubqlOK,
    isCacheOK,
    isRPCOK,
    msg,
    moreInfo: {
      // cache
      cachedBlocksCount,
      maxCachedBlocksCount: maxCachedBlocks,
      // subql
      lastProcessedHeight,
      targetHeight,
      curFinalizedHeight,
      lastProcessedTimestamp,
      curTimestamp,
      idleSeconds: idleTime,
      idleBlocks,
      indexerHealthy,
      // RPC
      ethCallTiming,
      // listeners
      // TODO: currently only print out info, no threshold check
      listenersCount
    }
  };
};

const TIME_OUT = 20000; // 20s
export const runWithTiming = async <F extends AnyFunction>(
  fn: F,
  repeats: number = 3
): Promise<{
  time: number;
  res: F extends (...args: any[]) => infer R ? R | string : any;
}> => {
  let res = null;
  const t0 = performance.now();
  let runningErr = false;
  let timedout = false;

  try {
    for (let i = 0; i < repeats; i++) {
      res = await promiseWithTimeout(fn(), TIME_OUT);

      // fn should always return something
      if (res === null) {
        res = `error in runWithTiming: timeout after ${TIME_OUT / 1000} seconds`;
        timedout = true;
        break;
      }
    }
  } catch (e) {
    res = `error in runWithTiming: ${(e as any).toString()}`;
    runningErr = true;
  }

  const t1 = performance.now();
  const time = runningErr ? -1 : timedout ? -999 : (t1 - t0) / repeats;

  return {
    res,
    time
  };
};

const ETH_DECIMALS = 18;
export const nativeToEthDecimal = (value: any, nativeDecimals: number = 12): BigNumber =>
  BigNumber.from(value).mul(10 ** (ETH_DECIMALS - nativeDecimals));

export const parseBlockTag = async (_blockTag: BlockTagish | Eip1898BlockTag): Promise<string | number | undefined> => {
  const blockTag = await _blockTag;

  if (!blockTag || typeof blockTag !== 'object') return blockTag;

  return blockTag.blockHash || blockTag.blockNumber;
};

// https://github.com/AcalaNetwork/Acala/blob/067b65bc19ff525bdccae020ad2bd4bdf41f4300/modules/evm/rpc/src/lib.rs#L122
export const decodeRevertMsg = (hexMsg: string) => {
  const data = hexToU8a(hexMsg);
  const msgStart = 68;
  if (data.length <= msgStart) return '';

  const msgLength = BigNumber.from(data.slice(36, msgStart));
  const msgEnd = msgStart + msgLength.toNumber();

  if (data.length < msgEnd) return '';

  const body = data.slice(msgStart, msgEnd);

  return new TextDecoder('utf-8').decode(body);
};

// https://github.com/AcalaNetwork/Acala/blob/067b65bc19ff525bdccae020ad2bd4bdf41f4300/modules/evm/rpc/src/lib.rs#L87
export const checkEvmExecutionError = (data: CallInfo['ok']): void => {
  if (!data) return;

  const { exit_reason: exitReason, value: returnData } = data;
  if (!exitReason.succeed) {
    let msg, err;
    if (exitReason.revert) {
      msg = decodeRevertMsg(returnData);
      err = new Error(`VM Exception while processing transaction: execution revert: ${msg} ${returnData}`);
    } else if (exitReason.fatal) {
      msg = JSON.stringify(exitReason.fatal);
      err = new Error(`execution fatal: ${msg}`);
    } else if (exitReason.error) {
      const reason = Object.keys(exitReason.error)[0];
      msg = reason === 'other' ? exitReason.error[reason] : reason;
      err = new Error(`execution error: ${msg}`);
    } else {
      err = new Error('unknown eth call error');
    }

    (err as any).code = -32603;
    throw err;
  }
};
