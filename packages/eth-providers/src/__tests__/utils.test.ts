import { ApiPromise, WsProvider } from '@polkadot/api';
import { FrameSystemAccountInfo } from '@polkadot/types/lookup';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { hexValue } from '@ethersproject/bytes';

import { ALICE_ADDR, nodeUrl } from './utils';
import { CacheInspect } from '../utils/BlockCache';
import {
  EthCallTimingResult,
  checkEvmExecutionError,
  decodeRevertMsg,
  getHealthResult,
  hexlifyRpcResult,
  isEvmExtrinsic,
  parseBlockTag,
  runWithTiming,
  sleep,
} from '../utils';
import { EvmRpcProvider } from '../rpc-provider';
import { HeadsInfo } from '../base-provider';
import { _Metadata } from '../utils/gqlTypes';
import { queryStorage } from '../utils/queryStoarge';


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
        logIndex: 1,
      },
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
        logIndex: '0x1',
      },
    ]);
  });
});

describe('isEvmExtrinsic', () => {
  it('returns correct result', () => {
    const fakeEVMExtrinsic = {
      method: {
        section: {
          toLowerCase() {
            return 'evm';
          },
        },
      },
    };

    const fakeSUDOExtrinsic = {
      method: {
        section: {
          toLowerCase() {
            return 'sudo';
          },
        },
      },
    };

    expect(isEvmExtrinsic(fakeEVMExtrinsic as any)).to.equal(true);
    expect(isEvmExtrinsic(fakeSUDOExtrinsic as any)).to.equal(false);

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
    const ERR_MSG = 'goku';
    const f = async () => {
      throw new Error(ERR_MSG);
    };

    const { res, time } = await runWithTiming(f);
    expect(res).to.contain(`error in runWithTiming: Error: ${ERR_MSG}`);
    expect(time).to.equal(-1);
  });

  it('returns correct error for timeout', async () => {
    vi.useFakeTimers();

    const f = async () => {
      await sleep(99999);
    };

    const resPromise = runWithTiming(f);
    vi.advanceTimersByTime(20000);
    const { res, time } = await resPromise;

    expect(res).to.contain('error in runWithTiming: timeout after');
    expect(time).to.equal(-999);

    vi.useRealTimers();
  });
});

describe('getHealthResult', () => {
  const isIndexerHealthy = true;
  const lastProcessedHeight = 2000;
  const lastProcessedTimestamp = Date.now() - 10000;
  const targetHeight = 2002;
  const finalizedHeight = targetHeight;
  const indexerMeta: _Metadata = {
    indexerHealthy: isIndexerHealthy,
    lastProcessedHeight,
    lastProcessedTimestamp,
    targetHeight,
  };

  const headsInfo: HeadsInfo = {
    internalState: {
      curHeight: finalizedHeight + 2,
      curHash: '0x34567',
      finalizedHeight,
      finalizedHash: '0x12321',
    },
    chainState: {
      curHeight: finalizedHeight + 2,
      curHash: '0x34567',
      finalizedHeight,
      finalizedHash: '0x12321',
    },
  };

  const maxCachedBlocks = 200;
  const cachedBlocksCount = 196;
  const cacheInfo: CacheInspect = {
    maxCachedBlocks,
    cachedBlocksCount,
    txHashToReceipt: {},
    blockHashToReceipts: {},
  };

  const curFinalizedHeight = targetHeight;

  const gasPriceTime = 1688;
  const estimateGasTime = 1234;
  const getBlockTime = 2874;
  const getFullBlockTime = 678;
  const ethCallTiming: EthCallTimingResult = {
    gasPriceTime,
    estimateGasTime,
    getBlockTime,
    getFullBlockTime,
  };

  const healthResult = {
    isHealthy: true,
    isHeadsOK: true,
    isSubqlOK: true,
    isCacheOK: true,
    isRPCOK: true,
    msg: [],
    moreInfo: {
      headsInfo,
      cache: {
        maxCachedBlocksCount: maxCachedBlocks,
        cachedBlocksCount,
      },
      subql: {
        lastProcessedHeight,
        targetHeight,
        lastProcessedTimestamp,
        idleBlocks: curFinalizedHeight - lastProcessedHeight,
        isIndexerHealthy: indexerMeta.indexerHealthy!,
      },
      ethCallTiming,
      listeners: {
        newHead: 0,
        newFinalizedHead: 0,
        logs: 0,
      },
    },
  };

  const healthyData = {
    indexerMeta,
    cacheInfo,
    headsInfo,
    ethCallTiming,
    listenersCount: { newHead: 0, newFinalizedHead: 0, logs: 0 },
  };

  const expectedSubql = expect.objectContaining(healthResult.moreInfo.subql);

  it('return correct healthy data when healthy', () => {
    const res = getHealthResult(healthyData);

    expect(res).toEqual(expect.objectContaining({
      ...healthResult,
      moreInfo: expect.objectContaining({
        ...healthResult.moreInfo,
        subql: expectedSubql,
      }),
    }));
  });

  describe('return correct error when unhealthy', () => {
    it('when indexer unhealthy', () => {
      const lastProcessedHeightBad = lastProcessedHeight - 100;
      const lastProcessedTimestampBad = lastProcessedTimestamp - 35 * 60 * 1000;

      const res = getHealthResult({
        ...healthyData,
        indexerMeta: {
          ...indexerMeta,
          lastProcessedHeight: lastProcessedHeightBad,
          lastProcessedTimestamp: lastProcessedTimestampBad,
        },
      });

      expect(res).toEqual(expect.objectContaining({
        ...healthResult,
        isHealthy: false,
        isSubqlOK: false,
        msg: expect.any(Array),
        moreInfo: expect.objectContaining({
          ...healthResult.moreInfo,
          subql: expect.objectContaining({
            ...healthResult.moreInfo.subql,
            lastProcessedHeight: lastProcessedHeightBad,
            lastProcessedTimestamp: lastProcessedTimestampBad,
            idleBlocks: curFinalizedHeight - lastProcessedHeightBad,
          }),
        }),
      }));

      expect(res.msg.length).to.equal(2);
    });

    it('when heads out of sync', () => {
      const internalHeadsBad = {
        curHeight: headsInfo.internalState.curHeight - 125,
        curHash: '0xrrr',
        finalizedHeight: headsInfo.internalState.finalizedHeight - 678,
        finalizedHash: '0xhhh',
      };

      const res = getHealthResult({
        ...healthyData,
        headsInfo: {
          ...headsInfo,
          internalState: internalHeadsBad,
        },
      });

      expect(res).toEqual(expect.objectContaining({
        ...healthResult,
        isHealthy: false,
        isHeadsOK: false,
        msg: [
          `curHeight mismatch! chain: ${headsInfo.chainState.curHeight}, internal: ${internalHeadsBad.curHeight}`,
          `finalizedHeight mismatch! chain: ${headsInfo.chainState.finalizedHeight}, internal: ${internalHeadsBad.finalizedHeight}`,
        ],
        moreInfo: expect.objectContaining({
          ...healthResult.moreInfo,
          subql: expectedSubql,
          headsInfo: {
            ...headsInfo,
            internalState: internalHeadsBad,
          },
        }),
      }));
    });

    it('when cache unhealthy', () => {
      const cachedBlocksCountBad = cachedBlocksCount + 1300;
      const res = getHealthResult({
        ...healthyData,
        cacheInfo: {
          ...cacheInfo,
          cachedBlocksCount: cachedBlocksCountBad,
        },
      });

      expect(res).toEqual(expect.objectContaining({
        ...healthResult,
        isHealthy: false,
        isCacheOK: false,
        msg: [
          `cached blocks size is bigger than expected: ${cachedBlocksCountBad}, expect at most ~${maxCachedBlocks}`,
        ],
        moreInfo: expect.objectContaining({
          ...healthResult.moreInfo,
          subql: expectedSubql,
          cache: expect.objectContaining({
            ...healthResult.moreInfo.cache,
            cachedBlocksCount: cachedBlocksCountBad,
          }),
        }),
      }));
    });

    it('when RPC becomes slow', () => {
      const ethCallTimingBad = {
        ...ethCallTiming,
        getFullBlockTime: 23000,
      };
      const res = getHealthResult({
        ...healthyData,
        ethCallTiming: ethCallTimingBad,
      });

      expect(res).toEqual(expect.objectContaining({
        ...healthResult,
        isHealthy: false,
        isRPCOK: false,
        msg: [
          `an RPC is getting slow, takes more than 5 seconds to complete internally. All timings: ${JSON.stringify(
            ethCallTimingBad
          )}`,
        ],
        moreInfo: expect.objectContaining({
          ...healthResult.moreInfo,
          subql: expectedSubql,
          ethCallTiming: ethCallTimingBad,
        }),
      }));
    });

    it('when RPC has running error', () => {
      const ethCallTimingBad = {
        ...ethCallTiming,
        getFullBlockTime: -1,
      };
      const res = getHealthResult({
        ...healthyData,
        ethCallTiming: ethCallTimingBad,
      });

      expect(res).toEqual(expect.objectContaining({
        ...healthResult,
        isHealthy: false,
        isRPCOK: false,
        msg: [`an RPC is getting running errors. All timings: ${JSON.stringify(ethCallTimingBad)}`],
        moreInfo: expect.objectContaining({
          ...healthResult.moreInfo,
          subql: expectedSubql,
          ethCallTiming: ethCallTimingBad,
        }),
      }));
    });

    it('when RPC timeouts', () => {
      const ethCallTimingBad = {
        ...ethCallTiming,
        getFullBlockTime: -999,
      };
      const res = getHealthResult({
        ...healthyData,
        ethCallTiming: ethCallTimingBad,
      });

      expect(res).toEqual(expect.objectContaining({
        ...healthResult,
        isHealthy: false,
        isRPCOK: false,
        msg: [`an RPC is getting timeouts. All timings: ${JSON.stringify(ethCallTimingBad)}`],
        moreInfo: expect.objectContaining({
          ...healthResult.moreInfo,
          subql: expectedSubql,
          ethCallTiming: ethCallTimingBad,
        }),
      }));
    });
  });
});

describe('parseBlockTag', () => {
  const blockNumber = 123;
  const blockNumberHex = '0x13568';
  const blockHash = '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3';

  it('correctly parse normal tags', async () => {
    expect(await parseBlockTag(blockNumberHex)).to.equal(blockNumberHex);
    expect(await parseBlockTag(blockNumber)).to.equal(blockNumber);
    expect(await parseBlockTag(blockHash)).to.equal(blockHash);
    expect(await parseBlockTag('latest')).to.equal('latest');
    expect(await parseBlockTag(undefined)).to.equal(undefined);

    expect(await parseBlockTag(Promise.resolve(blockNumberHex))).to.equal(blockNumberHex);
    expect(await parseBlockTag(Promise.resolve(blockNumber))).to.equal(blockNumber);
    expect(await parseBlockTag(Promise.resolve(blockHash))).to.equal(blockHash);
    expect(await parseBlockTag(Promise.resolve('latest'))).to.equal('latest');
    expect(await parseBlockTag(undefined)).to.equal(undefined);
  });

  it('correctly parse EIP-1898 tags', async () => {
    expect(await parseBlockTag({ blockNumber: blockNumberHex })).to.equal(blockNumberHex);
    expect(await parseBlockTag({ blockNumber })).to.equal(blockNumber);
    expect(await parseBlockTag({ blockHash })).to.equal(blockHash);
  });
});

describe('eth call error handling', () => {
  const invalidCurrencyIdHex =
    '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000013696e76616c69642063757272656e6379206964';

  describe('decodeRevertMsg', () => {
    it('correctly decode', () => {
      expect(decodeRevertMsg(invalidCurrencyIdHex)).to.equal('invalid currency id');
    });
  });

  describe('checkEvmExecutionError', () => {
    const commonData = {
      usedGas: '0x0',
      usedStorage: 0,
      logs: [],
    };

    it('when should throw - reverted', () => {
      const data = {
        exitReason: { revert: 'Reverted' as const },
        value: invalidCurrencyIdHex,
        ...commonData,
      };

      expect(() => checkEvmExecutionError(data)).to.throw('invalid currency id');
    });

    it('when should throw - outOfFund', () => {
      const data = {
        exitReason: {
          error: { outOfFund: null },
        },
        value: invalidCurrencyIdHex,
        ...commonData,
      };

      expect(() => checkEvmExecutionError(data)).to.throw('outOfFund');
    });

    it('when should throw - ExistentialDeposit', () => {
      const data = {
        exitReason: {
          error: { other: 'ExistentialDeposit' },
        },
        value: invalidCurrencyIdHex,
        ...commonData,
      };

      expect(() => checkEvmExecutionError(data)).to.throw('ExistentialDeposit');
    });

    it('when should not throw', () => {
      {
        const data = {
          exitReason: { succeed: 'Returned' as const },
          value: '0x123456789',
          ...commonData,
        };
        expect(() => checkEvmExecutionError(data)).to.not.throw();
      }

      {
        const data = {
          exitReason: { succeed: 'Stopped' as const },
          value: '0x',
          ...commonData,
        };
        expect(() => checkEvmExecutionError(data)).to.not.throw();
      }
    });
  });
});

describe('query storage', () => {
  let api: ApiPromise;


  beforeAll(async () => {
    api = await ApiPromise.create({ provider: new WsProvider(nodeUrl) });
  });

  afterAll(async () => {
    await api.disconnect();
  });

  it('timestamp.now', async () => {
    const _testQueryStorage = async (blockHash: string) => {
      const timestamp = await queryStorage(
        api,
        'timestamp.now',
        [],
        blockHash
      );

      const timestampReal = await (await api.at(blockHash)).query.timestamp.now();

      console.log(timestamp.toJSON(), timestampReal.toJSON());
      expect(timestamp.toJSON()).to.deep.eq(timestampReal.toJSON());
    };

    const curBlockHash = (await api.rpc.chain.getBlockHash()).toString();
    const curBlockNum = (await api.rpc.chain.getHeader()).number.toNumber();
    const randBlock = curBlockNum - Math.floor(Math.random() * 1000);
    console.log(curBlockNum, randBlock);
    const randBlockHash = (await api.rpc.chain.getBlockHash(randBlock)).toString();

    await _testQueryStorage(curBlockHash);
    await _testQueryStorage(randBlockHash);
  });

  it('system.account', async () => {
    const _testQueryStorage = async (blockHash: string) => {
      const accountInfo = await queryStorage<FrameSystemAccountInfo>(
        api,
        'system.account',
        [ALICE_ADDR],
        blockHash
      );

      const accountInfoReal = await (await api.at(blockHash)).query.system.account(ALICE_ADDR);

      console.log(accountInfo.toJSON(), accountInfoReal.toJSON());
      expect(accountInfo.toJSON()).to.deep.eq(accountInfoReal.toJSON());
    };

    const curBlockHash = (await api.rpc.chain.getBlockHash()).toString();
    const curBlockNum = (await api.rpc.chain.getHeader()).number.toNumber();
    const randBlock = curBlockNum - Math.floor(Math.random() * 1000);
    const randBlockHash = (await api.rpc.chain.getBlockHash(randBlock)).toString();

    console.log(curBlockNum, randBlock);
    console.log(curBlockHash, randBlockHash);

    await _testQueryStorage(curBlockHash);
    await _testQueryStorage(randBlockHash);   // fails on 7332027
  });
});
