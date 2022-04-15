import { hexValue } from '@ethersproject/bytes';
import chai from 'chai';
import chaiSubset from 'chai-subset';
import FakeTimer from '@sinonjs/fake-timers';
import { EthCallTimingResult, getHealthResult, hexlifyRpcResult, isEVMExtrinsic, runWithTiming, sleep } from '../utils';
import { CacheInspect } from '../utils/BlockCache';
import { _Metadata } from '../utils/gqlTypes';

chai.use(chaiSubset);
const { expect } = chai;

describe('utils', () => {
  it('connect chain', async () => {
    const a = hexValue(1616274408000);
    const b = hexValue(0);

    expect(a).to.equal('0x17851764240');
    expect(b).to.equal('0x0');
  });

  it('getLogs hexlify', () => {
    const data = [
      {
        blockNumber: 422586,
        blockHash: '0xa1a07ccf1bb31e8da1e1d62cb5aecd3012f8596826ce750f976d7f1fdfb542a5',
        transactionIndex: 0,
        removed: false,
        address: '0xe6f4a83ee9f946b86a2ef008dcd872f4a942db24',
        data: '0x426ab38338be5d42c2cafd1075db80e71965e43f87c11536d8cf0a0dae40d54300000000000000000000000029b563951ed0eb9ae5c49692266e1fbc81445cfe00000000000000000000000029b563951ed0eb9ae5c49692266e1fbc81445cfe00000000000000000000000064ff10dced55d2efeb47f132dd09d37616bfbd18000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000002532c0a3b36bf2a0bbe9a9e96ceeb0ef55ed415dfaafae68823b57bcbffab4e0cca',
        topics: ['0x79fa08de5149d912dce8e5e8da7a7c17ccdf23dd5d3bfe196802e6eb86347c7c'],
        transactionHash: '0x20220cf9d4bf9a666fc7507b47ae85339a81a899c958a83af644453243c86603',
        logIndex: 1
      }
    ];

    const result = hexlifyRpcResult(data);

    expect(result).deep.eq([
      {
        blockNumber: '0x672ba',
        blockHash: '0xa1a07ccf1bb31e8da1e1d62cb5aecd3012f8596826ce750f976d7f1fdfb542a5',
        transactionIndex: '0x0',
        removed: false,
        address: '0xe6f4a83ee9f946b86a2ef008dcd872f4a942db24',
        data: '0x426ab38338be5d42c2cafd1075db80e71965e43f87c11536d8cf0a0dae40d54300000000000000000000000029b563951ed0eb9ae5c49692266e1fbc81445cfe00000000000000000000000029b563951ed0eb9ae5c49692266e1fbc81445cfe00000000000000000000000064ff10dced55d2efeb47f132dd09d37616bfbd18000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000002532c0a3b36bf2a0bbe9a9e96ceeb0ef55ed415dfaafae68823b57bcbffab4e0cca',
        topics: ['0x79fa08de5149d912dce8e5e8da7a7c17ccdf23dd5d3bfe196802e6eb86347c7c'],
        transactionHash: '0x20220cf9d4bf9a666fc7507b47ae85339a81a899c958a83af644453243c86603',
        logIndex: '0x1'
      }
    ]);
  });
});

describe('isEVMExtrinsic', () => {
  it('returns correct result', () => {
    const fakeEVMExtrinsic = {
      method: {
        section: {
          toUpperCase() {
            return 'EVM';
          }
        }
      }
    };

    const fakeSUDOExtrinsic = {
      method: {
        section: {
          toUpperCase() {
            return 'SUDO';
          }
        }
      }
    };

    expect(isEVMExtrinsic(fakeEVMExtrinsic)).to.equal(true);
    expect(isEVMExtrinsic(fakeSUDOExtrinsic)).to.equal(false);

    /* ---------- TODO:
       we have a lot of Extrinsics related helpers
       that can be extracted as pure function helper
       we can come up with better mock extrinsics,
       or even better, construct real Extrinsics,
       so can tests these more comprehensively
                                            -------- */
  });
});

describe('runwithTiming', () => {
  it('returns correct result and running time', async () => {
    const runningTime = 1000;
    const funcRes = 'vegeta';
    const f = async () => {
      await sleep(runningTime);
      return funcRes;
    };

    const { res, time } = await runWithTiming(f);
    expect(res).to.equal(funcRes);
    expect(time).to.greaterThan(runningTime);
    expect(time).to.lessThan(runningTime * 2);
  });

  it('returns correct error for running errors', async () => {
    const runningTime = 1000;
    const funcRes = 'vegeta';
    const ERR_MSG = 'goku';
    const f = async () => {
      throw new Error(ERR_MSG);
    };

    const { res, time } = await runWithTiming(f);
    expect(res).to.contain(`error in runWithTiming: Error: ${ERR_MSG}`);
    expect(time).to.equal(-1);
  });

  it('returns correct error for timeout', async () => {
    const clock = FakeTimer.install();

    const f = async () => {
      await sleep(99999);
    };

    const resPromise = runWithTiming(f);
    clock.tick(20000);
    const { res, time } = await resPromise;

    expect(res).to.contain('error in runWithTiming: timeout after');
    expect(time).to.equal(-999);

    clock.uninstall();
  });
});

describe('getHealthResult', () => {
  const indexerHealthy = true;
  const lastProcessedHeight = 2000;
  const lastProcessedTimestamp = Date.now() - 10000;
  const targetHeight = 2002;
  const indexerMeta: _Metadata = {
    indexerHealthy,
    lastProcessedHeight,
    lastProcessedTimestamp,
    targetHeight
  };

  const maxCachedBlocks = 200;
  const cachedBlocksCount = 196;
  const cacheInfo: Partial<CacheInspect> = {
    maxCachedBlocks,
    cachedBlocksCount
  };

  let curFinalizedHeight = targetHeight;

  const gasPriceTime = 1688;
  const estimateGasTime = 1234;
  const getBlockTime = 2874;
  const getFullBlockTime = 678;
  let ethCallTiming: EthCallTimingResult = {
    gasPriceTime,
    estimateGasTime,
    getBlockTime,
    getFullBlockTime
  };

  const healthResult = {
    isHealthy: true,
    isSubqlOK: true,
    isCacheOK: true,
    isRPCOK: true,
    msg: [],
    moreInfo: {
      cachedBlocksCount,
      maxCachedBlocksCount: maxCachedBlocks,
      // subql
      lastProcessedHeight,
      targetHeight,
      curFinalizedHeight,
      lastProcessedTimestamp,
      idleBlocks: curFinalizedHeight - lastProcessedHeight,
      indexerHealthy,
      // RPC
      ethCallTiming
    }
  };

  it('return correct healthy data when healthy', () => {
    const res = getHealthResult({
      indexerMeta,
      cacheInfo,
      curFinalizedHeight,
      ethCallTiming
    });

    // console.log(res)
    expect(res).containSubset(healthResult);
  });

  describe('return correct error when unhealthy', () => {
    it('when indexer unhealthy', () => {
      const lastProcessedHeightBad = lastProcessedHeight - 100;
      const lastProcessedTimestampBad = lastProcessedTimestamp - 35 * 60 * 1000;

      const res = getHealthResult({
        indexerMeta: {
          ...indexerMeta,
          lastProcessedHeight: lastProcessedHeightBad,
          lastProcessedTimestamp: lastProcessedTimestampBad
        },
        cacheInfo,
        curFinalizedHeight,
        ethCallTiming
      });

      expect(res).containSubset({
        ...healthResult,
        isHealthy: false,
        isSubqlOK: false,
        moreInfo: {
          ...healthResult.moreInfo,
          maxCachedBlocksCount: maxCachedBlocks,
          lastProcessedHeight: lastProcessedHeightBad,
          lastProcessedTimestamp: lastProcessedTimestampBad,
          idleBlocks: curFinalizedHeight - lastProcessedHeightBad
        }
      });

      expect(res.msg.length).to.equal(2);
    });

    it('when cache unhealthy', () => {
      const cachedBlocksCountBad = cachedBlocksCount + 1300;
      const res = getHealthResult({
        indexerMeta,
        cacheInfo: {
          ...cacheInfo,
          cachedBlocksCount: cachedBlocksCountBad
        },
        curFinalizedHeight,
        ethCallTiming
      });

      expect(res).containSubset({
        ...healthResult,
        isHealthy: false,
        isCacheOK: false,
        msg: [
          `cached blocks size is bigger than expected: ${cachedBlocksCountBad}, expect at most ~${maxCachedBlocks}`
        ],
        moreInfo: {
          ...healthResult.moreInfo,
          cachedBlocksCount: cachedBlocksCountBad
        }
      });
    });

    it('when RPC becomes slow', () => {
      const ethCallTimingBad = {
        ...ethCallTiming,
        getFullBlockTime: 23000
      };
      const res = getHealthResult({
        indexerMeta,
        cacheInfo,
        curFinalizedHeight,
        ethCallTiming: ethCallTimingBad
      });

      expect(res).containSubset({
        ...healthResult,
        isHealthy: false,
        isRPCOK: false,
        msg: [
          `an RPC is getting slow, takes more than 5 seconds to complete internally. All timings: ${JSON.stringify(
            ethCallTimingBad
          )}`
        ],
        moreInfo: {
          ...healthResult.moreInfo,
          ethCallTiming: ethCallTimingBad
        }
      });
    });

    it('when RPC has running error', () => {
      const ethCallTimingBad = {
        ...ethCallTiming,
        getFullBlockTime: -1
      };
      const res = getHealthResult({
        indexerMeta,
        cacheInfo,
        curFinalizedHeight,
        ethCallTiming: ethCallTimingBad
      });

      expect(res).containSubset({
        ...healthResult,
        isHealthy: false,
        isRPCOK: false,
        msg: [`an RPC is getting running errors. All timings: ${JSON.stringify(ethCallTimingBad)}`],
        moreInfo: {
          ...healthResult.moreInfo,
          ethCallTiming: ethCallTimingBad
        }
      });
    });

    it('when RPC timeouts', () => {
      const ethCallTimingBad = {
        ...ethCallTiming,
        getFullBlockTime: -999
      };
      const res = getHealthResult({
        indexerMeta,
        cacheInfo,
        curFinalizedHeight,
        ethCallTiming: ethCallTimingBad
      });

      expect(res).containSubset({
        ...healthResult,
        isHealthy: false,
        isRPCOK: false,
        msg: [`an RPC is getting timeouts. All timings: ${JSON.stringify(ethCallTimingBad)}`],
        moreInfo: {
          ...healthResult.moreInfo,
          ethCallTiming: ethCallTimingBad
        }
      });
    });
  });
});
