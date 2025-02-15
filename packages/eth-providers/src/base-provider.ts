import {
  Provider as AbstractProvider,
  Block,
  BlockTag,
  BlockWithTransactions,
  EventType,
  FeeData,
  Listener,
  Log,
  Provider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/abstract-provider';
import { AcalaEvmTX, checkSignatureType, parseTransaction } from '@acala-network/eth-transactions';
import { AccessList, accessListify } from 'ethers/lib/utils';
import { AccountId32, H160, H256, Header } from '@polkadot/types/interfaces';
import { ApiPromise } from '@polkadot/api';
import { AsyncAction } from 'rxjs/internal/scheduler/AsyncAction';
import { AsyncScheduler } from 'rxjs/internal/scheduler/AsyncScheduler';
import { BigNumber, BigNumberish, Wallet } from 'ethers';
import { Deferrable, defineReadOnly, resolveProperties } from '@ethersproject/properties';
import { Formatter } from '@ethersproject/providers';
import { FrameSystemAccountInfo, ModuleEvmModuleAccountInfo } from '@polkadot/types/lookup';
import { ISubmittableResult } from '@polkadot/types/types';
import { Logger } from '@ethersproject/logger';
import { Network } from '@ethersproject/networks';
import { Observable, ReplaySubject, Subscription, firstValueFrom, throwError } from 'rxjs';
import { Option, u64 } from '@polkadot/types-codec';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { filter, first, timeout } from 'rxjs/operators';
import { getAddress } from '@ethersproject/address';
import { hexDataLength, hexValue, hexZeroPad, hexlify, isHexString, joinSignature } from '@ethersproject/bytes';
import BN from 'bn.js';
import LRUCache from 'lru-cache';

import {
  BIGNUMBER_ZERO,
  BLOCK_GAS_LIMIT,
  BLOCK_STORAGE_LIMIT,
  CACHE_SIZE_WARNING,
  DUMMY_BLOCK_NONCE,
  DUMMY_LOGS_BLOOM,
  DUMMY_SUBSTRATE_ADDR,
  EMPTY_HEX_STRING,
  EMTPY_UNCLES,
  EMTPY_UNCLE_HASH,
  ERROR_PATTERN,
  LOCAL_MODE_MSG,
  ONE_HUNDRED_GWEI,
  PROD_MODE_MSG,
  SAFE_MODE_WARNING_MSG,
  ZERO,
  ZERO_BLOCK_HASH,
} from './consts';
import {
  BaseLogFilter,
  HealthResult,
  LogFilter,
  PROVIDER_ERRORS,
  SanitizedLogFilter,
  TxRequestWithGas,
  calcEthereumTransactionParams,
  calcSubstrateTransactionParams,
  checkEvmExecutionError,
  computeDefaultEvmAddress,
  computeDefaultSubstrateAddress,
  decodeEthGas,
  encodeGasLimit,
  filterLog,
  filterLogByAddress,
  filterLogByBlockNumber,
  filterLogByTopics,
  getAllReceiptsAtBlock,
  getHealthResult,
  getTransactionRequest,
  hexlifyRpcResult,
  isEvmExtrinsic,
  logger,
  nativeToEthDecimal,
  parseBlockTag,
  parseExtrinsic,
  receiptToTransaction,
  runWithRetries,
  runWithTiming,
  sendTx,
  sortObjByKey,
  subqlReceiptAdapter,
  throwNotImplemented,
  toBN,
} from './utils';
import { BlockCache, CacheInspect } from './utils/BlockCache';
import { MaxSizeSet } from './utils/MaxSizeSet';
import { SubqlProvider } from './utils/subqlProvider';
import { _Metadata } from './utils/gqlTypes';
import { apiCache } from './utils/ApiAtCache';
import { queryStorage } from './utils/queryStoarge';

export interface HeadsInfo {
  internalState: {
    finalizedHeight: number;
    finalizedHash: string;
    curHeight: number;
    curHash: string;
  };
  chainState: {
    curHeight: number;
    curHash: string;
    finalizedHeight: number;
    finalizedHash: string;
  };
}

export type Eip1898BlockTag = {
  blockNumber: string | number;
} | {
  blockHash: string;
}

export type Signature = 'Ethereum' | 'AcalaEip712' | 'Substrate';

export interface BlockData {
  hash: `0x${string}`;
  parentHash: `0x${string}`;
  number: number;
  stateRoot: `0x${string}`;
  transactionsRoot: `0x${string}`;
  timestamp: number;
  nonce: `0x${string}`;
  mixHash: `0x${string}`;
  difficulty: number;
  totalDifficulty: number;
  gasLimit: BigNumber; // 15m for now. TODO: query this from blockchain
  gasUsed: BigNumber; // TODO: not full is 0

  miner: string;
  extraData: `0x${string}`;
  sha3Uncles: `0x${string}`;
  receiptsRoot: `0x${string}`;
  logsBloom: `0x${string}`; // TODO: ???
  size: number;
  uncles: string[];

  transactions: `0x${string}`[] | TX[];

  // baseFeePerGas: BIGNUMBER_ZERO,
  // with baseFeePerGas Metamask will send token with EIP-1559 format
  // but we want it to send with legacy format
}

export type Numberish = bigint | string | number;

export interface SubstrateEvmCallRequest {
  from?: string;
  to?: string;
  gasLimit?: Numberish;
  storageLimit?: Numberish;
  value?: Numberish;
  data?: string;
  accessList?: AccessList;
}

export interface partialTX {
  from: string;
  to: string | null; // null for contract creation
  blockHash: string | null; // null for pending TX
  blockNumber: number | null; // null for pending TX
  transactionIndex: number | null; // null for pending TX
}

export interface TX extends partialTX {
  hash: string;
  nonce: number;
  value: BigNumberish;
  gasPrice: BigNumberish;
  gas: BigNumberish;
  input: string;
  v: string;
  r: string;
  s: string;
}

export interface TXReceipt extends partialTX {
  contractAddress: string | null;
  root?: string;
  gasUsed: BigNumber;
  logsBloom: string;
  transactionHash: string;
  logs: Array<Log>;
  cumulativeGasUsed: BigNumber;
  effectiveGasPrice: BigNumber;
  type: number;
  status?: number;
}

export interface GasConsts {
  storageDepositPerByte: bigint;
  txFeePerGas: bigint;
  storageByteDeposit: bigint;
}
export interface EventData {
  [index: string]: {
    weight: {
      refTime: number;
      proofSize: number;
    };
    class: string;
    paysFee: string;
  };
}

export interface BaseProviderOptions {
  safeMode?: boolean;
  localMode?: boolean;
  verbose?: boolean;
  subqlUrl?: string;
  maxBlockCacheSize?: number;
  storageCacheSize?: number;
  healthCheckBlockDistance?: number;
}

export type BlockTagish = BlockTag | Promise<BlockTag> | undefined;

/* ---------- subscriptions ---------- */
export enum SubscriptionType {
  NewHeads = 'newHeads',
  NewFinalizedHeads = 'newFinalizedHeads',
  Logs = 'logs'
}
export interface BlockListener {
  id: string;
  cb: (data: any) => void;
}

export interface LogListener extends BlockListener {
  filter: BaseLogFilter;
}

export interface EventListeners {
  [SubscriptionType.NewHeads]: BlockListener[];
  [SubscriptionType.NewFinalizedHeads]: BlockListener[];
  [SubscriptionType.Logs]: LogListener[];
}

/* ---------- filters ---------- */
export enum PollFilterType {
  NewBlocks = 'newBlocks',
  Logs = 'logs'
}
export interface BlockPollFilter {
  id: string;
  lastPollBlockNumber: number;
  lastPollTimestamp: number;
}

export interface LogPollFilter extends BlockPollFilter {
  logFilter: LogFilter;
}

export interface PollFilters {
  [PollFilterType.NewBlocks]: BlockPollFilter[];
  [PollFilterType.Logs]: LogPollFilter[];
}

export interface CallReturnInfo {
  exitReason: {
    succeed?: 'Stopped' | 'Returned' | 'Suicided';
    error?: any;
    revert?: 'Reverted';
    fatal?: any;
  };
  value: string;
  usedGas: string;
  usedStorage: number;
  logs: Log[];
}

export interface PendingTx {
  blockHash: string;
  blockNumber: null;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  input: string;
  nonce: string;
  to: string | null;
  transactionIndex: null;
  value: string;
  v: string;
  r: string;
  s: string;
}
export interface TxpoolContent {
  pending: { [from: string]: { [nonce: string]: PendingTx } };
  queued: { [from: string]: { [nonce: string]: PendingTx } };
}

export abstract class BaseProvider extends AbstractProvider {
  readonly _api?: ApiPromise;
  readonly subql?: SubqlProvider;
  readonly formatter: Formatter;
  readonly eventListeners: EventListeners;
  readonly pollFilters: PollFilters;
  readonly safeMode: boolean;
  readonly localMode: boolean;
  readonly verbose: boolean;
  readonly maxBlockCacheSize: number;
  readonly queryCache: LRUCache<string, any>;
  readonly blockCache: BlockCache;
  readonly finalizedBlockHashes: MaxSizeSet;

  network?: Network | Promise<Network>;

  #subscription: Promise<() => void> | undefined;
  head$: Observable<Header>;
  finalizedHead$: Observable<Header>;
  best$ = new ReplaySubject<{ hash: string; number: number }>(1);
  finalized$ = new ReplaySubject<{ hash: string; number: number }>(1);

  readonly #async = new AsyncScheduler(AsyncAction);

  readonly #headTasks: Map<string, Subscription> = new Map();
  readonly #finalizedHeadTasks: Map<string, Subscription> = new Map();

  constructor({
    safeMode = false,
    localMode = false,
    verbose = false,
    maxBlockCacheSize = 200,
    storageCacheSize = 5000,
    subqlUrl,
  }: BaseProviderOptions = {}) {
    super();
    this.formatter = new Formatter();
    this.eventListeners = {
      [SubscriptionType.NewHeads]: [],
      [SubscriptionType.NewFinalizedHeads]: [],
      [SubscriptionType.Logs]: [],
    };
    this.pollFilters = { [PollFilterType.NewBlocks]: [], [PollFilterType.Logs]: [] };
    this.safeMode = safeMode;
    this.localMode = localMode;
    this.verbose = verbose;
    this.maxBlockCacheSize = maxBlockCacheSize;
    this.queryCache = new LRUCache({ max: storageCacheSize });
    this.blockCache = new BlockCache(this.maxBlockCacheSize);
    this.finalizedBlockHashes = new MaxSizeSet(this.maxBlockCacheSize);

    this.subql = subqlUrl ? new SubqlProvider(subqlUrl) : undefined;

    /* ---------- messages ---------- */
    safeMode && logger.warn(SAFE_MODE_WARNING_MSG);
    this.verbose && logger.warn(localMode ? LOCAL_MODE_MSG : PROD_MODE_MSG);

    if (this.maxBlockCacheSize < 0) {
      return logger.throwError(
        `expect maxBlockCacheSize >= 0, but got ${this.maxBlockCacheSize}`,
        Logger.errors.INVALID_ARGUMENT
      );
    } else {
      this.maxBlockCacheSize > 9999 && logger.warn(CACHE_SIZE_WARNING);
    }
  }

  get bestBlockHash() {
    return this.blockCache.lastCachedBlock.hash;
  }

  get bestBlockNumber() {
    return this.blockCache.lastCachedBlock.number;
  }

  get finalizedBlockHash() {
    return firstValueFrom(this.finalized$).then(
      ({ hash: chainFinalizedHash, number: chainFinalizedNumber }) =>
        chainFinalizedNumber <= this.bestBlockNumber
          ? chainFinalizedHash
          : this.bestBlockHash
    );
  }

  get finalizedBlockNumber() {
    return firstValueFrom(this.finalized$).then(
      ({ number: chainFinalizedNumber }) => Math.min(this.bestBlockNumber, chainFinalizedNumber)
    );
  }

  static isProvider(value: any): value is Provider {
    return !!(value && value._isProvider);
  }

  startSubscriptions = async () => {
    this.head$ = this.api.rx.rpc.chain.subscribeNewHeads();
    this.finalizedHead$ = this.api.rx.rpc.chain.subscribeFinalizedHeads();

    const headSub = this.head$.subscribe(header => {
      this.best$.next({
        hash: header.hash.toHex(),
        number: header.number.toNumber(),
      });
    });

    const finalizedSub = this.finalizedHead$.subscribe(header => {
      this.finalizedBlockHashes.add(header.hash.toHex());
      this.finalized$.next({
        hash: header.hash.toHex(),
        number: header.number.toNumber(),
      });
    });

    const firstBlock = await firstValueFrom(this.head$);
    await firstValueFrom(this.finalizedHead$);

    const safeHead$ = this.safeMode
      ? this.finalizedHead$
      : this.head$;

    const headTasksSub = safeHead$.pipe(
      // no reciepts for genesis block
      filter(header => header.number.toNumber() > 0)
    ).subscribe(header => {
      const task = this.#async.schedule(this._onNewHead, 0, [header, 5]);
      this.#headTasks.set(header.hash.toHex(), task);
    });

    const finalizedTasksSub = this.finalizedHead$.pipe(
      filter(header => header.number.toNumber() > 0)
    ).subscribe(header => {
      // notify subscribers
      const task = this.#async.schedule(this._onNewFinalizedHead, 0, [header, 5]);
      this.#finalizedHeadTasks.set(header.hash.toHex(), task);
    });

    this.blockCache.setlastCachedBlock({
      hash: firstBlock.hash.toHex(),
      number: firstBlock.number.toNumber(),
    });

    return () => {
      headSub.unsubscribe();
      finalizedSub.unsubscribe();
      headTasksSub.unsubscribe();
      finalizedTasksSub.unsubscribe();
    };
  };

  _onNewHead = async ([header, attempts]: [Header, number]) => {
    attempts--;
    const blockHash = header.hash.toHex();
    const blockNumber = header.number.toNumber();

    try {
      const receipts = await getAllReceiptsAtBlock(this.api, blockHash);

      // update block cache, this should happen *before* notifying subscribers about the new block
      this.blockCache.addReceipts(blockHash, receipts);
      this.blockCache.setlastCachedBlock({ hash: blockHash, number: blockNumber });

      // eth_subscribe
      await this._notifySubscribers(header, receipts);
      this.#headTasks.get(blockHash)?.unsubscribe();
      this.#headTasks.delete(blockHash);
    } catch (e) {
      if (attempts) {
        // reschedule after 1s
        const task = this.#async.schedule(this._onNewHead, 1_000, [header, attempts]);
        this.#headTasks.get(blockHash)?.unsubscribe();
        this.#headTasks.set(blockHash, task);
      } else {
        console.log('_onNewHead task failed, give up', blockHash, e.toString());
      }
    }
  };

  _onNewFinalizedHead = async ([header, attempts]: [Header, number]) => {
    attempts--;
    const blockHash = header.hash.toHex();
    try {
      const block = await this.getBlockDataForHeader(header, false);
      const response = hexlifyRpcResult(block);
      this.eventListeners[SubscriptionType.NewFinalizedHeads].forEach(l => l.cb(response));
      this.#finalizedHeadTasks.get(blockHash)?.unsubscribe();
      this.#finalizedHeadTasks.delete(blockHash);
    } catch (e) {
      if (attempts) {
        // reschedule after 1s
        const task = this.#async.schedule(this._onNewFinalizedHead, 1_000, [header, attempts]);
        this.#finalizedHeadTasks.get(blockHash)?.unsubscribe();
        this.#finalizedHeadTasks.set(blockHash, task);
      } else {
        console.log('_onNewFinalizedHead task failed, give up', blockHash, e.toString());
      }
    }
  };

  _notifySubscribers = async (header: Header, receipts: TransactionReceipt[]) => {
    const headSubscribers = this.eventListeners[SubscriptionType.NewHeads];
    const logSubscribers = this.eventListeners[SubscriptionType.Logs];

    if (headSubscribers.length > 0 || logSubscribers.length > 0) {
      const block = await this.getBlockDataForHeader(header, false);

      const response = hexlifyRpcResult(block);
      headSubscribers.forEach(l => l.cb(response));

      if (logSubscribers.length > 0) {
        const logs = receipts.map(r => r.logs).flat();

        logSubscribers.forEach(({ cb, filter }) => {
          const filteredLogs = logs.filter(log => filterLog(log, filter));
          hexlifyRpcResult(filteredLogs).forEach(cb);
        });
      }
    }
  };

  setApi = (api: ApiPromise): void => {
    defineReadOnly(this, '_api', api);
  };

  get api(): ApiPromise {
    return this._api ?? logger.throwError('the api needs to be set', Logger.errors.UNKNOWN_ERROR);
  }

  get genesisHash(): string {
    return this.api.genesisHash.toHex();
  }

  get isConnected(): boolean {
    return this.api.isConnected;
  }

  get chainDecimal(): number {
    return this.api.registry.chainDecimals[0] || 10;
  }

  get isSafeMode(): boolean {
    return this.safeMode;
  }

  isReady = async (): Promise<void> => {
    try {
      await this.api.isReadyOrError;

      this.#subscription ??= this.startSubscriptions();

      // wait for subscription to happen
      await this.#subscription;
    } catch (e) {
      await this.api.disconnect();
      throw e;
    }
  };

  disconnect = async (): Promise<void> => {
    this.eventListeners[SubscriptionType.NewHeads] = [];
    this.eventListeners[SubscriptionType.NewFinalizedHeads] = [];
    this.eventListeners[SubscriptionType.Logs] = [];
    this.#subscription && (await this.#subscription)();

    let attempts = 5;
    while(attempts) {
      attempts--;

      const pendingTasks = this.#headTasks.size + this.#finalizedHeadTasks.size;
      if (pendingTasks === 0) break;

      // wait 1 second for all tasks to complete, then try again
      await new Promise(r => setTimeout(r, 1000));
      console.log(`disconnecting, waiting for ${pendingTasks} tasks to complete`);
    }

    await this.api.disconnect();
  };

  getNetwork = async (): Promise<Network> => {
    await this.isReady();

    this.network ??= {
      name: this.api.runtimeVersion.specName.toString(),
      chainId: await this.chainId(),
    };

    return this.network;
  };

  netVersion = async (): Promise<string> =>
    this.api.consts.evmAccounts.chainId.toString();

  chainId = async (): Promise<number> =>
    this.api.consts.evmAccounts.chainId.toNumber();

  getBlockNumber = async (): Promise<number> => (
    this.safeMode
      ? this.finalizedBlockNumber
      : this.bestBlockNumber
  );

  getTimestamp = async (blockHash: string): Promise<number> => {
    const timestamp = await queryStorage<u64>(this.api, 'timestamp.now', [], blockHash);
    return timestamp.toNumber();
  };

  getBlockData = async (_blockTag: BlockTag | Promise<BlockTag>, full?: boolean): Promise<BlockData> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(_blockTag);
    const header = await this._getBlockHeader(blockTag);
    return await this.getBlockDataForHeader(header, full);
  };

  getBlockDataForHeader = async (header: Header, full?: boolean): Promise<BlockData> => {
    const blockHash = header.hash.toHex();
    const blockNumber = header.number.toNumber();

    let blockDataFull: BlockData;

    const cacheKey = `block-${blockHash}`;
    const cached = this.queryCache.get<BlockData>(cacheKey);
    if (cached) {
      blockDataFull = cached;
    } else {
      const [block, headerExtended, timestamp, receiptsFromSubql] = await Promise.all([
        this.api.rpc.chain.getBlock(blockHash),
        this.api.derive.chain.getHeader(blockHash),
        this.getTimestamp(blockHash),
        this.subql?.getAllReceiptsAtBlock(blockHash),
      ]);

      const authorSubstrate = headerExtended.author?.toString() ?? DUMMY_SUBSTRATE_ADDR;
      const author = (await this.getEvmAddress(authorSubstrate, blockHash)).toLowerCase();  // blockscout need `toLowerCase`

      let receipts: TransactionReceipt[];
      if (receiptsFromSubql?.length) {
        receipts = receiptsFromSubql.map(subqlReceiptAdapter);
      } else {
        /* ----------
          if nothing is returned from subql, either no tx exists in this block,
          or the block not finalized. So we still need to ask block cache.
                                                                      ---------- */
        receipts = this.blockCache.getAllReceiptsAtBlock(blockHash);
      }

      const transactions = receipts.map(tx => receiptToTransaction(tx, block));
      const gasUsed = receipts.reduce((totalGas, tx) => totalGas.add(tx.gasUsed), BIGNUMBER_ZERO);

      blockDataFull = {
        hash: blockHash,
        parentHash: headerExtended.parentHash.toHex(),
        number: blockNumber,
        stateRoot: headerExtended.stateRoot.toHex(),
        transactionsRoot: headerExtended.extrinsicsRoot.toHex(),
        timestamp: Math.floor(timestamp / 1000),
        nonce: DUMMY_BLOCK_NONCE,
        mixHash: ZERO_BLOCK_HASH,
        difficulty: ZERO,
        totalDifficulty: ZERO,
        gasLimit: BigNumber.from(BLOCK_GAS_LIMIT),
        gasUsed,

        miner: author,
        extraData: EMPTY_HEX_STRING,
        sha3Uncles: EMTPY_UNCLE_HASH,
        receiptsRoot: headerExtended.extrinsicsRoot.toHex(),
        logsBloom: DUMMY_LOGS_BLOOM, // TODO: ???
        size: block.encodedLength,
        uncles: EMTPY_UNCLES,

        transactions,
      };

      const isFinalized = blockNumber <= await this.finalizedBlockNumber;
      if (isFinalized) {
        this.queryCache.set(cacheKey, blockDataFull);
      }
    }

    const blockData = full
      ? blockDataFull
      : {
        ...blockDataFull,
        transactions: blockDataFull.transactions.map(tx => (tx as TX).hash as `0x${string}`),
      };

    return blockData;
  };

  getBlock = async (_blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>): Promise<Block> =>
    throwNotImplemented('getBlock (please use `getBlockData` instead)');

  getBlockWithTransactions = async (
    _blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>
  ): Promise<BlockWithTransactions> =>
    throwNotImplemented('getBlockWithTransactions (please use `getBlockData` instead)');

  getBalance = async (
    addressOrName: string | Promise<string>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<BigNumber> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    const [address, blockHash] = await Promise.all([
      addressOrName,
      this._getBlockHash(blockTag),
    ]);

    const substrateAddress = await this.getSubstrateAddress(address, blockHash);

    const accountInfo = await queryStorage<FrameSystemAccountInfo>(
      this.api,
      'system.account',
      [substrateAddress],
      blockHash
    );

    return nativeToEthDecimal(accountInfo.data.free.toBigInt());
  };

  getTransactionCount = async (
    addressOrName: string | Promise<string>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<number> => {
    const blockTag = await parseBlockTag(_blockTag);

    let pendingNonce = 0;
    if (blockTag === 'pending') {
      const [substrateAddress, pendingExtrinsics] = await Promise.all([
        this.getSubstrateAddress(await addressOrName),
        this.api.rpc.author.pendingExtrinsics(),
      ]);

      pendingNonce = pendingExtrinsics.filter(
        e => isEvmExtrinsic(e) &&
        e.signer.toString() === substrateAddress
      ).length;
    }

    const evmAccountInfo = await this.queryEvmAccountInfo(addressOrName, blockTag);
    const minedNonce = evmAccountInfo?.nonce?.toNumber?.() ?? 0;

    return minedNonce + pendingNonce;
  };

  getCode = async (
    addressOrName: string | Promise<string>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<string> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));
    const blockHash = await this._getBlockHash(blockTag);

    const evmAccountInfo = await this.queryEvmAccountInfo(addressOrName, blockHash);
    const contractInfo = evmAccountInfo?.contractInfo.unwrapOr(null);
    if (!contractInfo) { return '0x'; }

    const code = await queryStorage(this.api, 'evm.codes', [contractInfo.codeHash], blockHash);
    return code.toHex();
  };

  call = async (
    transaction: Deferrable<TxRequestWithGas>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<string> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    const [ethReq, blockHash] = await Promise.all([
      getTransactionRequest(transaction),
      this._getBlockHash(blockTag),
    ]);

    ethReq.gasPrice ??= await this.getGasPrice();
    ethReq.gasLimit ??= BigNumber.from(999999920);

    const substrateGas = this._getSubstrateGasParams(ethReq);

    const callRequest: SubstrateEvmCallRequest = {
      ...ethReq,
      value: ethReq.value?.toBigInt(),
      ...substrateGas,
    };

    const res = await this._ethCall(callRequest, blockHash);

    return res.value;
  };

  _ethCall = async (
    callRequest: SubstrateEvmCallRequest,
    at?: string,
  ): Promise<CallReturnInfo> => {
    const api = at ? await apiCache.getApiAt(this.api, at) : this.api;

    // call evm rpc when `state_call` is not supported yet
    if (!api.call.evmRuntimeRPCApi) {
      const data = await this.api.rpc.evm.call(callRequest);

      return {
        exitReason: { succeed: 'Returned' },
        value: data.toHex(),
        usedGas: '0',
        usedStorage: 0,
        logs: [],
      };
    }

    const { from, to, gasLimit, storageLimit, value, data, accessList } = callRequest;
    const estimate = false;

    const res = to
      ? await api.call.evmRuntimeRPCApi.call(from, to, data, value, gasLimit, storageLimit, accessList, estimate)
      : await api.call.evmRuntimeRPCApi.create(from, data, value, gasLimit, storageLimit, accessList, estimate);

    const ok = res.toJSON()['ok'] as CallReturnInfo | undefined;
    if (!ok) {
      // substrate level error
      let errMsg: string;
      const err = res.asErr;
      if (err.isModule) {
        const { index, error } = err.asModule;
        const errInfo = this.api.registry.findMetaError({
          index: new BN(index),
          error: new BN(error.toU8a()[0]),
        });

        errMsg = `internal JSON-RPC error [${errInfo.section}.${errInfo.name}: ${errInfo.docs}]`;
      } else {
        errMsg = err.toString();
      }

      return logger.throwError(errMsg, Logger.errors.CALL_EXCEPTION, callRequest);
    }

    // check evm level error
    checkEvmExecutionError(ok);

    return ok;
  };

  getStorageAt = async (
    addressOrName: string | Promise<string>,
    position: BigNumberish | Promise<BigNumberish>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<string> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    const [address, blockHash, resolvedPosition] = await Promise.all([
      addressOrName,
      this._getBlockHash(blockTag),
      Promise.resolve(position).then(hexValue),
    ]);

    const code = await queryStorage<H256>(
      this.api,
      'evm.accountStorages',
      [address, hexZeroPad(resolvedPosition, 32)],
      blockHash
    );

    return code.toHex();
  };

  // @TODO
  resolveName = async (name: string | Promise<string>): Promise<string> => {
    name = await name;

    return name;
    // If it is already an address, nothing to resolve
    // try {
    //   return Promise.resolve(this.formatter.address(name));
    // } catch (error) {
    //   // If is is a hexstring, the address is bad (See #694)
    //   if (isHexString(name)) {
    //     throw error;
    //   }
    // }

    // if (typeof name !== 'string') {
    //   logger.throwArgumentError('invalid ENS name', 'name', name);
    // }

    // // Get the addr from the resovler
    // const resolver = await this.getResolver(name);
    // if (!resolver) {
    //   return null;
    // }

    // return resolver.getAddress();
  };

  getGasPrice = async (validBlocks = 200): Promise<BigNumber> => {
    return BigNumber.from(ONE_HUNDRED_GWEI).add(await this.bestBlockNumber + validBlocks);
  };

  getFeeData = async (): Promise<FeeData> => {
    return {
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      lastBaseFeePerGas: null,
      gasPrice: await this.getGasPrice(),
    };
  };

  _getGasConsts = (): GasConsts => ({
    storageDepositPerByte: this.api.consts.evm.storageDepositPerByte.toBigInt(),
    txFeePerGas: this.api.consts.evm.txFeePerGas.toBigInt(),
    storageByteDeposit: this.api.consts.evm.storageDepositPerByte.toBigInt(),
  });

  /**
   * Estimate gas for a transaction.
   * @param transaction The transaction to estimate the gas of
   * @returns The estimated gas used by this transaction
   */
  estimateGas = async (
    transaction: Deferrable<TransactionRequest>,
    blockTag?: BlockTag,
  ): Promise<BigNumber> => {
    const blockHash = blockTag && blockTag !== 'latest'
      ? await this._getBlockHash(blockTag)
      : undefined;  // if blockTag is latest, avoid explicit blockhash for better performance

    const { usedGas, gasLimit, safeStorage } = await this.estimateResources(transaction, blockHash);

    const tx = await resolveProperties(transaction);
    const data = tx.data?.toString() ?? '0x';

    const createParams = [
      data,
      toBN(BigNumber.from(tx.value ?? 0)),
      toBN(gasLimit),
      toBN(safeStorage),
      accessListify(tx.accessList ?? []),
    ] as const;

    const callParams = [tx.to!, ...createParams] as const;

    const extrinsic = tx.to
      ? this.api.tx.evm.call(...callParams)
      : this.api.tx.evm.create(...createParams);

    let txFee = await this._estimateGasCost(extrinsic, blockHash);
    txFee = txFee.mul(gasLimit).div(usedGas); // scale it to the same ratio when estimate passing gasLimit

    const storageFee = safeStorage.mul(this._getGasConsts().storageDepositPerByte);
    txFee = txFee.add(storageFee);

    const gasPrice = tx.gasPrice && BigNumber.from(tx.gasPrice).gt(0)
      ? BigNumber.from(tx.gasPrice)
      : await this.getGasPrice();

    const tokenTransferSelector = '0xa9059cbb';   // transfer(address,uint256)
    const isTokenTransfer = hexlify(await transaction.data ?? '0x').startsWith(tokenTransferSelector);
    return encodeGasLimit(txFee, gasPrice, gasLimit, safeStorage, isTokenTransfer);
  };

  _estimateGasCost = async (
    extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>,
    at?: string,
  ) => {
    const blockHash = at ?? this.bestBlockHash;
    const apiAt = await apiCache.getApiAt(this.api, blockHash);

    const u8a = extrinsic.toU8a();
    const lenIncreaseAfterSignature = 100;    // approximate length increase after signature
    const feeDetails = await apiAt.call.transactionPaymentApi.queryFeeDetails(
      u8a,
      u8a.length + lenIncreaseAfterSignature,
    );
    const { baseFee, lenFee, adjustedWeightFee } = feeDetails.inclusionFee.unwrap();

    const nativeTxFee = BigNumber.from(
      baseFee.toBigInt() +
      lenFee.toBigInt() +
      adjustedWeightFee.toBigInt()
    );

    return nativeToEthDecimal(nativeTxFee);
  };

  /**
   * helper to get ETH gas when don't know the whole transaction
   * default to return big enough gas for contract deployment
   * @returns The gas used by eth transaction
   */
  _getEthGas = async ({
    gasLimit = 21000000,
    storageLimit = 64100,
    validUntil: _validUntil,
  }: {
    gasLimit?: BigNumberish;
    storageLimit?: BigNumberish;
    validUntil?: BigNumberish;
  } = {}): Promise<{
    gasPrice: BigNumber;
    gasLimit: BigNumber;
  }> => {
    const validUntil = _validUntil || (await this.getBlockNumber()) + 150; // default 150 * 12 / 60 = 30min

    const { txGasLimit, txGasPrice } = calcEthereumTransactionParams({
      gasLimit,
      storageLimit,
      validUntil,
      ...this._getGasConsts(),
    });

    return {
      gasLimit: txGasLimit,
      gasPrice: txGasPrice,
    };
  };

  /**
   * Validate substrate transaction parameters
   */
  validSubstrateResources = ({
    gasLimit,
    gasPrice,
  }: {
    gasLimit: BigNumberish;
    gasPrice: BigNumberish;
  }): {
    gasLimit: BigNumber;
    storageLimit: BigNumber;
    validUntil: BigNumber;
  } => calcSubstrateTransactionParams({
    txGasPrice: gasPrice,
    txGasLimit: gasLimit,
    ...this._getGasConsts(),
  });

  /**
   * Estimate resources for a transaction.
   * @param transaction The transaction to estimate the resources of
   * @returns The estimated resources used by this transaction
   */
  estimateResources = async (
    transaction: Deferrable<TxRequestWithGas>,
    blockHash?: string,
  ): Promise<{
    usedGas: BigNumber;
    gasLimit: BigNumber;
    safeStorage: BigNumber;
  }> => {
    const ethTx = await getTransactionRequest(transaction);

    const minGasLimit = 21000;
    let maxGasLimit = BLOCK_GAS_LIMIT * 10;
    let storageLimit = BLOCK_STORAGE_LIMIT;

    // if user explicitly provides gasLimit override, decode it and use as max values
    if (ethTx.gasLimit !== undefined || ethTx.gasPrice !== undefined) {
      const substrateGasParams = decodeEthGas({
        gasLimit: ethTx.gasLimit ?? BigNumber.from(199999),   // use max storage limit and gas limit
        gasPrice: ethTx.gasPrice ?? await this.getGasPrice(),
      });

      if (substrateGasParams.validUntil < await this.getBlockNumber()) {
        return logger.throwError(
          'invalid gasPrice, which corresponds to a too low validUntil',
          Logger.errors.CALL_EXCEPTION,
          transaction
        );
      }

      maxGasLimit = Number(substrateGasParams.gasLimit);
      storageLimit = Number(substrateGasParams.storageLimit);
    }

    const txRequest = {
      ...ethTx,
      gasLimit: maxGasLimit,
      storageLimit,
      value: BigNumber.isBigNumber(ethTx.value) ? ethTx.value.toBigInt() : ethTx.value,
    };

    const gasInfo = await this._ethCall(txRequest, blockHash);
    const usedGas = BigNumber.from(gasInfo.usedGas).toNumber();
    const usedStorage = gasInfo.usedStorage;

    /* ----------
       try using a gasLimit slightly more than actual used gas
       if it already works, which should be the usual case
       we don't need to waste time doing binary search
                                                    ---------- */
    let gasLimit = Math.floor(usedGas * 1.2);
    let gasAlreadyWorks = true;
    try {
      await this._ethCall({
        ...txRequest,
        gasLimit,
      }, blockHash);
    } catch {
      gasAlreadyWorks = false;
    }

    if (!gasAlreadyWorks) {
      // need to binary search the best passing gasLimit
      let lowest = minGasLimit;
      let highest = maxGasLimit;
      let mid = Math.min(usedGas * 3, Math.floor((lowest + highest) / 2));
      let prevHighest = highest;
      while (highest - lowest > 1) {
        try {
          await this._ethCall({
            ...txRequest,
            gasLimit: mid,
          }, blockHash);
          highest = mid;

          if ((prevHighest - highest) / prevHighest < 0.1) break;
          prevHighest = highest;
        } catch (e: any) {
          if ((e.message as string).includes('revert') || (e.message as string).includes('outOfGas')) {
            lowest = mid;
          } else {
            throw e;
          }
        }

        mid = Math.floor((highest + lowest) / 2);
      }

      gasLimit = highest;
    }

    // Some contracts rely on block height and have different treatments.
    // Transfer use `usedStorage`
    const safeStorage = ethTx.data?.length > 0
      ? Math.floor((Math.max(usedStorage, 0) + 64) * 1.1)
      : Math.max(usedStorage, 0);

    return {
      usedGas: BigNumber.from(usedGas),         // actual used gas
      gasLimit: BigNumber.from(gasLimit),       // gasLimit to pass execution
      safeStorage: BigNumber.from(safeStorage), // slightly over estimated storage to be safer
    };
  };

  getSubstrateAddress = async (address: string, blockTag?: BlockTag): Promise<string> => {
    const blockHash = await this._getBlockHash(blockTag);
    const substrateAccount = await queryStorage<Option<AccountId32>>(
      this.api,
      'evmAccounts.accounts',
      [address],
      blockHash
    );

    return substrateAccount.isEmpty
      ? computeDefaultSubstrateAddress(address)
      : substrateAccount.toString();
  };

  getEvmAddress = async (substrateAddress: string, blockTag?: BlockTag): Promise<string> => {
    const blockHash = await this._getBlockHash(blockTag);
    const evmAddress = await queryStorage<Option<H160>>(
      this.api,
      'evmAccounts.evmAddresses',
      [substrateAddress],
      blockHash
    );

    return getAddress(evmAddress.isEmpty ? computeDefaultEvmAddress(substrateAddress) : evmAddress.toString());
  };

  queryEvmAccountInfo = async (
    addressOrName: string | Promise<string>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<ModuleEvmModuleAccountInfo | null> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    const [address, blockHash] = await Promise.all([
      addressOrName,
      this._getBlockHash(blockTag),
    ]);

    const accountInfo = await queryStorage<Option<ModuleEvmModuleAccountInfo>>(
      this.api,
      'evm.accounts',
      [address],
      blockHash
    );

    return accountInfo.unwrapOr(null);
  };

  _getSubstrateGasParams = (ethTx: Partial<AcalaEvmTX>): {
    gasLimit: bigint;
    storageLimit: bigint;
    validUntil: bigint;
    tip: bigint;
    accessList: AccessList;
    v2: boolean;
  } => {
    let substrateParams: {
      gasLimit: bigint;
      storageLimit: bigint;
      validUntil: bigint;
      tip: bigint;
    };
    let v2 = false;

    if (ethTx.type === 96) {
      // EIP-712 transaction
      if (!ethTx.gasLimit) return logger.throwError('expect gasLimit');
      if (!ethTx.storageLimit) return logger.throwError('expect storageLimit');
      if (!ethTx.validUntil) return logger.throwError('expect validUntil');
      if (!ethTx.tip) return logger.throwError('expect priorityFee (tip)');

      substrateParams = {
        gasLimit: ethTx.gasLimit.toBigInt(),
        storageLimit: BigInt(ethTx.storageLimit.toString()),
        validUntil: BigInt(ethTx.validUntil.toString()),
        tip: BigInt(ethTx.tip.toString()),
      };
    } else if (
      ethTx.type === undefined || // legacy
      ethTx.type === null      || // legacy
      ethTx.type === 1         || // EIP-2930
      ethTx.type === 0            // EIP-155
    ) {
      try {
        const { storageDepositPerByte, txFeePerGas } = this._getGasConsts();

        const { gasLimit, validUntil, storageLimit } = calcSubstrateTransactionParams({
          txGasPrice: ethTx.maxFeePerGas || ethTx.gasPrice || '0',
          txGasLimit: ethTx.gasLimit || '0',
          storageByteDeposit: storageDepositPerByte,
          txFeePerGas: txFeePerGas,
        });

        if (gasLimit.lt(0) || validUntil.lt(0) || storageLimit.lt(0)) {
          throw new Error();
        }

        substrateParams = {
          gasLimit: gasLimit.toBigInt(),
          validUntil: validUntil.toBigInt(),
          storageLimit: storageLimit.toBigInt(),
          tip: 0n,
        };
      } catch {
        // v2
        v2 = true;

        if (!ethTx.gasLimit) return logger.throwError('expect gasLimit');
        if (!ethTx.gasPrice) return logger.throwError('expect gasPrice');

        substrateParams = decodeEthGas({
          gasLimit: ethTx.gasLimit,
          gasPrice: ethTx.gasPrice,
        });
      }
    } else if (ethTx.type === 2) {
      return logger.throwError(
        `unsupported transaction type: ${ethTx.type}, please use legacy or EIP-712 instead.`,
        Logger.errors.UNSUPPORTED_OPERATION,
        {
          operation: '_getSubstrateGasParams',
          transactionType: ethTx.type,
        }
      );
    } else {
      return logger.throwError(
        `unknwon transaction type: ${ethTx.type}`,
        Logger.errors.UNSUPPORTED_OPERATION,
        {
          operation: '_getSubstrateGasParams',
          transactionType: ethTx.type,
        }
      );
    }

    return {
      ...substrateParams,
      accessList: ethTx.accessList ?? [],
      v2,
    };
  };

  prepareTransaction = async (
    rawTx: string
  ): Promise<{
    extrinsic: SubmittableExtrinsic<'promise'>;
    transaction: AcalaEvmTX;
  }> => {
    const signatureType = checkSignatureType(rawTx);
    const ethTx = parseTransaction(rawTx);

    if (!ethTx.from) {
      return logger.throwError('missing from address', Logger.errors.INVALID_ARGUMENT, ethTx);
    }

    const { storageLimit, gasLimit, tip, accessList, validUntil, v2 } = this._getSubstrateGasParams(ethTx);

    // check excuted error
    const callRequest: SubstrateEvmCallRequest = {
      from: ethTx.from,
      to: ethTx.to,
      gasLimit: gasLimit,
      storageLimit: storageLimit,
      value: ethTx.value.toString(),
      data: ethTx.data,
      accessList: ethTx.accessList,
    };

    await this._ethCall(callRequest);

    const extrinsic = v2
      ? this.api.tx.evm.ethCallV2(
        ethTx.to ? { Call: ethTx.to } : { Create: null },
        ethTx.data,
        ethTx.value.toString(),
        ethTx.gasPrice?.toBigInt(),
        ethTx.gasLimit.toBigInt(),
        accessList,
      )
      : this.api.tx.evm.ethCall(
        ethTx.to ? { Call: ethTx.to } : { Create: null },
        ethTx.data,
        ethTx.value.toString(),
        gasLimit,
        storageLimit,
        accessList,
        validUntil,
      );

    const subAddr = await this.getSubstrateAddress(ethTx.from);

    const sig = joinSignature({ r: ethTx.r!, s: ethTx.s, v: ethTx.v });

    extrinsic.addSignature(subAddr, { [signatureType]: sig } as any, {
      blockHash: '0x', // ignored
      era: '0x00', // mortal
      genesisHash: '0x', // ignored
      method: 'Bytes', // don't know waht is this
      specVersion: 0, // ignored
      transactionVersion: 0, // ignored
      nonce: ethTx.nonce,
      tip,
    });

    return {
      extrinsic,
      transaction: ethTx,
    };
  };

  sendRawTransaction = async (rawTx: string): Promise<string> => {
    const { extrinsic } = await this.prepareTransaction(rawTx);

    await extrinsic.send();

    return extrinsic.hash.toHex();
  };

  sendTransaction = async (signedTransaction: string | Promise<string>): Promise<TransactionResponse> => {
    const hexTx = await Promise.resolve(signedTransaction).then(t => hexlify(t));
    const tx = parseTransaction(await signedTransaction);

    if ((tx as any).confirmations === null || (tx as any).confirmations === undefined) {
      (tx as any).confirmations = 0;
    }

    try {
      const { extrinsic, transaction } = await this.prepareTransaction(hexTx);
      //@TODO
      // wait for tx in block
      const result = await sendTx(this.api, extrinsic);
      const blockHash = result.status.isInBlock ? result.status.asInBlock : result.status.asFinalized;
      const header = await this._getBlockHeader(blockHash.toHex());
      const blockNumber = header.number.toNumber();
      const hash = extrinsic.hash.toHex();

      return this._wrapTransaction(transaction, hash, blockNumber, blockHash.toHex());
    } catch (err) {
      const error = err as any;
      for (const pattern of ERROR_PATTERN) {
        const match = ((error.toString?.() || '') as string).match(pattern);
        if (match) {
          const errDetails = this.api.registry.findMetaError(new Uint8Array([parseInt(match[1]), parseInt(match[2])]));

          // error.message is readonly, so construct a new error object
          throw new Error(
            JSON.stringify({
              message: `${errDetails.section}.${errDetails.name}: ${errDetails.docs}`,
              transaction: tx,
              transactionHash: tx.hash,
            })
          );
        }
      }

      error.transaction = tx;
      error.transactionHash = tx.hash;
      throw error;
    }
  };

  _wrapTransaction = async (
    tx: AcalaEvmTX,
    hash: string,
    startBlock: number,
    startBlockHash: string
  ): Promise<TransactionResponse> => {
    if (hash !== null && hash !== undefined && hexDataLength(hash) !== 32) {
      throw new Error('invalid hash - sendTransaction');
    }

    // Check the hash we expect is the same as the hash the server reported
    // @TODO expectedHash
    // if (hash != null && tx.hash !== hash) {
    //   logger.throwError('Transaction hash mismatch from Provider.sendTransaction.', Logger.errors.UNKNOWN_ERROR, {
    //     expectedHash: tx.hash,
    //     returnedHash: hash
    //   });
    // }

    const result = tx as TransactionResponse;

    // fix tx hash
    result.hash = hash;
    result.blockNumber = startBlock;
    result.blockHash = startBlockHash;

    const timestamp = await this.getTimestamp(result.blockHash);
    result.timestamp = Math.floor(timestamp / 1000);

    result.wait = async (confirms?: number, timeoutMs?: number) => {
      if (confirms === null || confirms === undefined) {
        confirms = 1;
      } else if (confirms < 0) {
        throw new Error('invalid confirms value');
      }
      if (timeoutMs === null || timeoutMs === undefined) {
        timeoutMs = 0;
      } else if (timeoutMs < 0) {
        throw new Error('invalid timeout value');
      }

      let wait$ = timeoutMs ? this.head$.pipe(
        timeout({
          first: timeoutMs,
          with: () => throwError(() => logger.makeError('timeout exceeded', Logger.errors.TIMEOUT, { timeout: timeoutMs })),
        })) : this.head$;

      wait$ = wait$.pipe(first(head => head.number.toNumber() - startBlock + 1 >= confirms));

      await firstValueFrom(wait$);

      const receipt = await this.getReceiptAtBlockFromChain(hash, startBlockHash);

      // tx was just mined so won't be null
      return receipt;
    };

    return result;
  };

  _getBlockNumber = async (blockTag: BlockTag): Promise<number> => {
    switch (blockTag) {
      case 'pending':
      case 'latest': {
        return this.getBlockNumber();
      }
      case 'earliest': {
        return 0;
      }
      case 'finalized':
      case 'safe': {
        return this.finalizedBlockNumber;
      }
      default: {
        if (isHexString(blockTag, 32)) {
          return (await this._getBlockHeader(blockTag as string)).number.toNumber();
        } else if (isHexString(blockTag) || typeof blockTag === 'number') {
          return BigNumber.from(blockTag).toNumber();
        }

        return logger.throwArgumentError(
          'blocktag should be number | hex string | \'latest\' | \'earliest\' | \'finalized\' | \'safe\'',
          'blockTag',
          blockTag
        );
      }
    }
  };

  _getBlockHash = async (_blockTag?: BlockTag): Promise<string> => {
    const blockTag = _blockTag ?? 'latest';

    switch (blockTag) {
      case 'pending':
      case 'latest': {
        return this.safeMode ? this.finalizedBlockHash : this.bestBlockHash;
      }
      case 'earliest': {
        const hash = this.api.genesisHash;
        return hash.toHex();
      }
      case 'finalized':
      case 'safe': {
        return this.finalizedBlockHash;
      }
      default: {
        if (isHexString(blockTag, 32)) {
          return blockTag as string;
        } else if (isHexString(blockTag) || typeof blockTag === 'number') {
          const blockNumber = BigNumber.from(blockTag);

          // max blockNumber is u32
          if (blockNumber.gt(0xffffffff)) {
            return logger.throwArgumentError('block number should be less than u32', 'blockNumber', blockNumber);
          }

          const cacheKey = `blockHash-${blockNumber.toHexString()}`;

          const cached = this.queryCache.get(cacheKey);
          if (cached) {
            return cached;
          }

          const _blockHash = await this.api.rpc.chain.getBlockHash(blockNumber.toBigInt());
          if (_blockHash.isEmpty) {
            //@ts-ignore
            return logger.throwError('header not found', PROVIDER_ERRORS.HEADER_NOT_FOUND, { blockNumber });
          }
          const blockHash = _blockHash.toHex();

          // no need to check for canonicality here since this blockHash is just queried from rpc
          const isFinalized = blockNumber.lte(await this.finalizedBlockNumber);
          if (isFinalized) {
            this.queryCache.set(cacheKey, blockHash);
          }

          return blockHash;
        }

        return logger.throwArgumentError(
          'blocktag should be number | hex string | \'latest\' | \'earliest\' | \'finalized\' | \'safe\'',
          'blockTag',
          blockTag
        );
      }
    }
  };

  _isBlockCanonical = async (blockHash: string, _blockNumber?: number): Promise<boolean> => {
    if (this.finalizedBlockHashes.has(blockHash)) return true;

    const blockNumber = _blockNumber ?? (await this._getBlockNumber(blockHash));
    const canonicalHash = await this.api.rpc.chain.getBlockHash(blockNumber);
    if (canonicalHash.isEmpty) {
      return logger.throwError('header not found', Logger.errors.CALL_EXCEPTION, { blockNumber });
    }

    return canonicalHash.toString() === blockHash;
  };

  _isBlockFinalized = async (blockTag: BlockTag): Promise<boolean> => {
    const [blockHash, blockNumber] = await Promise.all([
      this._getBlockHash(blockTag),
      this._getBlockNumber(blockTag),
    ]);

    return (
      await this.finalizedBlockNumber >= blockNumber &&
      await this._isBlockCanonical(blockHash, blockNumber)
    );
  };

  _isTransactionFinalized = async (txHash: string): Promise<boolean> => {
    const tx = await this.getReceipt(txHash);
    if (!tx) return false;

    return this._isBlockFinalized(tx.blockHash);
  };

  _ensureSafeModeBlockTagFinalization = async (_blockTag: BlockTagish): Promise<BlockTagish> => {
    if (!this.safeMode || !_blockTag) return _blockTag;

    const blockTag = await _blockTag;
    if (blockTag === 'latest') return this.finalizedBlockHash;

    const isBlockFinalized = await this._isBlockFinalized(blockTag);

    return isBlockFinalized
      ? blockTag
      : // We can also throw header not found error here, which is more consistent with actual block not found error. However, This error is more informative.
      logger.throwError('SAFE MODE ERROR: target block is not finalized', Logger.errors.UNKNOWN_ERROR, { blockTag });
  };

  _getBlockHeader = async (blockTag?: BlockTag | Promise<BlockTag>): Promise<Header> => {
    const blockHash = await this._getBlockHash(await blockTag);

    const cacheKey = `header-${blockHash}`;
    const cached = this.queryCache.get<Header>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const header = await this.api.rpc.chain.getHeader(blockHash);

      // no need to check for canonicality here since this header is just queried from rpc
      const isFinalized = header.number.toNumber() <= await this.finalizedBlockNumber;
      if (isFinalized) {
        this.queryCache.set(cacheKey, header);
      }

      return header;
    } catch (error) {
      if ((error as any)?.message?.match?.(/Unable to retrieve header and parent from supplied hash/gi)) {
        //@ts-ignore
        return logger.throwError('header not found', PROVIDER_ERRORS.HEADER_NOT_FOUND, { blockHash });
      }

      throw error;
    }
  };

  // from chain only
  getReceiptAtBlockFromChain = async (
    txHash: string | Promise<string>,
    _blockTag: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<TransactionReceipt | null> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));
    const blockHash = await this._getBlockHash(blockTag);

    const receipt = (await getAllReceiptsAtBlock(this.api, blockHash, await txHash))[0];
    return receipt ?? null;
  };

  // from cache or subql
  getReceiptAtBlock = async (
    hashOrNumber: number | string | Promise<string>,
    _blockTag: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<TransactionReceipt | null> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));
    hashOrNumber = await hashOrNumber;

    const blockHash = await this._getBlockHash(blockTag);

    return isHexString(hashOrNumber, 32)
      ? this._getReceiptAtBlockByHash(hashOrNumber as string, blockHash)
      : this._getReceiptAtBlockByIndex(hashOrNumber, blockHash);
  };

  _getReceiptAtBlockByHash = async (txHash: string, blockHash: string) => {
    const receipt = await this.getReceipt(txHash);
    return receipt?.blockHash === blockHash ? receipt : null;
  };

  _getReceiptAtBlockByIndex = async (txIdx: number | string, blockHash: string) => {
    // TODO: remove me after new subql re-indexing, it should be sorted automatically
    const sortByTxIdx = sortObjByKey('transactionIndex');

    const receiptIdx = BigNumber.from(txIdx).toNumber();
    const receiptFromCache = this.blockCache.getAllReceiptsAtBlock(blockHash).sort(sortByTxIdx)[receiptIdx];
    if (receiptFromCache && (await this._isBlockCanonical(receiptFromCache.blockHash, receiptFromCache.blockNumber)))
      return receiptFromCache;

    const receiptsAtBlock = await this.subql?.getAllReceiptsAtBlock(blockHash);
    const sortedReceipts = receiptsAtBlock?.sort(sortByTxIdx);
    return sortedReceipts?.[receiptIdx] ? subqlReceiptAdapter(sortedReceipts[receiptIdx]) : null;
  };

  _getPendingTX = async (txHash: string): Promise<TX | null> => {
    const pendingExtrinsics = await this.api.rpc.author.pendingExtrinsics();
    const targetExtrinsic = pendingExtrinsics.find(ex => ex.hash.toHex() === txHash);

    if (!(targetExtrinsic && isEvmExtrinsic(targetExtrinsic))) return null;

    return {
      from: await this.getEvmAddress(targetExtrinsic.signer.toString()),
      blockHash: null,
      blockNumber: null,
      transactionIndex: null,
      hash: txHash,
      gasPrice: 0, // TODO: reverse calculate using args.storage_limit if needed
      ...parseExtrinsic(targetExtrinsic),
    };
  };

  // Queries
  getTransaction = (_txHash: string): Promise<TransactionResponse> =>
    throwNotImplemented('getTransaction (deprecated: please use getTransactionByHash)');

  getTransactionByHash = async (txHash: string): Promise<TX | null> => {
    if (!this.localMode) {
      // local mode is for local instant-sealing node
      // so ignore pending tx to avoid some timing issue
      const pendingTX = await this._getPendingTX(txHash);
      if (pendingTX) return pendingTX;
    }

    const receipt = await this.getReceipt(txHash);
    if (!receipt) return null;

    // TODO: in the future can save parsed extraData in FullReceipt for ultimate performance
    // it's free info from getAllReceiptsAtBlock but requires 1 extra async call here
    const block = await this.api.rpc.chain.getBlock(receipt.blockHash);

    return receiptToTransaction(receipt, block);
  };

  getTransactionReceipt = async (_txHash: string): Promise<TransactionReceipt> =>
    throwNotImplemented('getTransactionReceipt (please use `getReceipt` instead)');

  getReceipt = async (txHash: string): Promise<TransactionReceipt | null> =>
    this.localMode
      ? await runWithRetries(this._getReceipt.bind(this), [txHash])
      : await this._getReceipt(txHash);

  _getReceipt = async (txHash: string): Promise<TransactionReceipt | null> => {
    const txFromCache = this.blockCache.getReceiptByHash(txHash);
    if (
      txFromCache &&
      await this._isBlockCanonical(txFromCache.blockHash, txFromCache.blockNumber)
    ) {
      delete txFromCache.byzantium;
      return txFromCache;
    }

    const txFromSubql = await this.subql?.getTxReceiptByHash(txHash);
    return txFromSubql
      ? subqlReceiptAdapter(txFromSubql)
      : null;
  };

  _sanitizeRawFilter = async (rawFilter: LogFilter): Promise<SanitizedLogFilter> => {
    const { fromBlock, toBlock, blockHash, address, topics } = rawFilter;
    const filter: SanitizedLogFilter = {
      address,
      topics,
    };

    if (blockHash && (fromBlock || toBlock)) {
      return logger.throwError(
        '`fromBlock` and `toBlock` is not allowed in params when `blockHash` is present',
        Logger.errors.INVALID_ARGUMENT,
        {
          blockHash,
          fromBlock,
          toBlock,
        }
      );
    }

    if (blockHash) {
      // eip-1898
      const blockNumber = (await this._getBlockHeader(blockHash)).number.toNumber();

      filter.fromBlock = blockNumber;
      filter.toBlock = blockNumber;
    } else {
      const fromBlockNumber = await this._getBlockNumber(fromBlock ?? 'latest');
      const toBlockNumber = await this._getBlockNumber(toBlock ?? 'latest');

      filter.fromBlock = fromBlockNumber;
      filter.toBlock = toBlockNumber;
    }

    return filter;
  };

  _getSubqlMissedLogs = async (toBlock: number, filter: SanitizedLogFilter): Promise<Log[]> => {
    const targetBlock = Math.min(toBlock, await this.finalizedBlockNumber);   // subql upperbound is finalizedBlockNumber
    const lastProcessedHeight = await this.subql.getLastProcessedHeight();
    const firstMissedHeight = lastProcessedHeight + 1;

    return this._getLogsFromCache(firstMissedHeight, targetBlock, filter);
  };

  _getLogsFromCache = async (
    fromBlock: number,
    toBlock: number,
    filter: SanitizedLogFilter,
  ): Promise<Log[]> => {
    const blockCount = toBlock - fromBlock + 1;   // when to === from, it should return 1 block
    if (blockCount <= 0) return [];

    const heights = Array.from(
      { length: blockCount },
      (_, i) => fromBlock + i,
    );
    const blockHashes = await Promise.all(heights.map(this._getBlockHash.bind(this)));

    return blockHashes
      .map(this.blockCache.getLogsAtBlock.bind(this))
      .flat()
      .filter(log => filterLogByBlockNumber(log, filter.fromBlock, filter.toBlock))
      .filter(log => filterLogByAddress(log, filter.address))
      .filter(log => filterLogByTopics(log, filter.topics));
  };

  // Bloom-filter Queries
  getLogs = async (rawFilter: LogFilter): Promise<Log[]> => {
    const filter = await this._sanitizeRawFilter(rawFilter);

    if (!this.subql) {
      const _throwErr = (earliestCachedBlockNumber?: number) => logger.throwError(
        'cache does not contain enough info to fetch requested logs, please reduce block range or initialize provider with a subql url',
        Logger.errors.SERVER_ERROR,
        {
          requestFromBlock: filter.fromBlock,
          earliestCachedBlockNumber,
        },
      );

      const earliestCachedBlockHash = this.blockCache.cachedBlockHashes[0];
      if (!earliestCachedBlockHash) return _throwErr();

      const earliestCachedBlockNumber = await this._getBlockNumber(earliestCachedBlockHash);
      const isAllTargetLogsInCache = earliestCachedBlockNumber <= filter.fromBlock;

      return isAllTargetLogsInCache
        ? await this._getLogsFromCache(filter.fromBlock, filter.toBlock, filter)
        : _throwErr(earliestCachedBlockNumber);
    }

    // only filter by blockNumber and address, since topics are filtered at last
    const [subqlLogs, extraLogs] = await Promise.all([
      this.subql.getFilteredLogs(filter),
      this._getSubqlMissedLogs(filter.toBlock, filter),
    ]);

    return subqlLogs.concat(extraLogs)
      .filter(log => filterLogByTopics(log, filter.topics))
      .map(log => this.formatter.filterLog(log));
  };

  getIndexerMetadata = async (): Promise<_Metadata | undefined> => {
    return this.subql?.getIndexerMetadata();
  };

  getCachInfo = (): CacheInspect | undefined => this.blockCache.inspect();

  _timeEthCalls = async (): Promise<{
    gasPriceTime: number;
    estimateGasTime: number;
    getBlockTime: number;
    getFullBlockTime: number;
  }> => {
    const HEALTH_CHECK_BLOCK_DISTANCE = 100;

    const gasPricePromise = runWithTiming(async () => this.getGasPrice());
    const estimateGasPromise = runWithTiming(async () =>
      this.estimateGas({
        from: '0xe3234f433914d4cfcf846491ec5a7831ab9f0bb3',
        value: '0x0',
        gasPrice: '0x2f0276000a',
        data: '0x',
        to: '0x22293227a254a481883ca5e823023633308cb9ca',
      })
    );

    // ideally pastNblock should have EVM TX
    const finalizedBlockNumber = await this.finalizedBlockNumber;
    const pastNblock =
    finalizedBlockNumber > HEALTH_CHECK_BLOCK_DISTANCE
      ? finalizedBlockNumber - HEALTH_CHECK_BLOCK_DISTANCE
      : finalizedBlockNumber;
    const getBlockPromise = runWithTiming(async () => this.getBlockData(pastNblock, false));
    const getFullBlockPromise = runWithTiming(async () => this.getBlockData(pastNblock, true));

    const [gasPriceTime, estimateGasTime, getBlockTime, getFullBlockTime] = (
      await Promise.all([gasPricePromise, estimateGasPromise, getBlockPromise, getFullBlockPromise])
    ).map(res => Math.floor(res.time));

    return {
      gasPriceTime,
      estimateGasTime,
      getBlockTime,
      getFullBlockTime,
    };
  };

  _getHeadsInfo = async (): Promise<HeadsInfo> => {
    const internalState = {
      curHeight: this.bestBlockNumber,
      curHash: this.bestBlockHash,
      finalizedHeight: await this.finalizedBlockNumber,
      finalizedHash: await this.finalizedBlockHash,
    };

    const [header, finalizedHeader] = await Promise.all([
      this.api.rpc.chain.getHeader(),
      this.api.rpc.chain.getFinalizedHead().then(hash => this.api.rpc.chain.getHeader(hash)),
    ]);

    const chainState = {
      curHeight: header.number.toNumber(),
      curHash: header.hash.toHex(),
      finalizedHeight: finalizedHeader.number.toNumber(),
      finalizedHash: finalizedHeader.hash.toHex(),
    };

    return { internalState, chainState };
  };

  // TODO: move the whole health check thing to a new class?
  healthCheck = async (): Promise<HealthResult> => {
    const [indexerMeta, ethCallTiming, headsInfo] = await Promise.all([
      this.getIndexerMetadata(),
      this._timeEthCalls(),
      this._getHeadsInfo(),
    ]);

    const cacheInfo = this.getCachInfo();

    const listenersCount = {
      newHead: this.eventListeners[SubscriptionType.NewHeads]?.length || 0,
      newFinalizedHead: this.eventListeners[SubscriptionType.NewFinalizedHeads]?.length || 0,
      logs: this.eventListeners[SubscriptionType.Logs]?.length || 0,
    };

    return getHealthResult({
      indexerMeta,
      cacheInfo,
      headsInfo,
      ethCallTiming,
      listenersCount,
    });
  };

  // ENS
  lookupAddress = (_address: string | Promise<string>): Promise<string> => throwNotImplemented('lookupAddress');

  waitForTransaction = (
    _transactionHash: string,
    _confirmations?: number,
    _timeout?: number
  ): Promise<TransactionReceipt> => throwNotImplemented('waitForTransaction');

  // Event Emitter (ish)
  addEventListener = (eventName: string, listener: Listener, filter: any = {}): string => {
    const id = Wallet.createRandom().address;
    const eventCallBack = (data: any): void =>
      listener({
        subscription: id,
        result: data,
      });

    if (eventName === SubscriptionType.NewHeads) {
      this.eventListeners[eventName].push({ cb: eventCallBack, id });
    } else if (eventName === SubscriptionType.NewFinalizedHeads) {
      this.eventListeners[eventName].push({ cb: eventCallBack, id });
    } else if (eventName === SubscriptionType.Logs) {
      this.eventListeners[eventName].push({ cb: eventCallBack, filter, id });
    } else {
      return logger.throwError(
        `subscription type [${eventName}] is not supported, expect ${Object.values(SubscriptionType)}`,
        Logger.errors.INVALID_ARGUMENT
      );
    }

    return id;
  };

  removeEventListener = (id: string): boolean => {
    let found = false;
    Object.values(SubscriptionType).forEach(e => {
      const targetIdx = this.eventListeners[e].findIndex(l => l.id === id);
      if (targetIdx !== undefined && targetIdx !== -1) {
        this.eventListeners[e].splice(targetIdx, 1);
        found = true;
      }
    });

    return found;
  };

  addPollFilter = async (filterType: string, logFilter: any = {}): Promise<string> => {
    const id = Wallet.createRandom().address;
    const baseFilter = {
      id,
      lastPollBlockNumber: await this.getBlockNumber(),
      lastPollTimestamp: Date.now(), // TODO: add expire
    };

    if (filterType === PollFilterType.NewBlocks) {
      this.pollFilters[filterType].push(baseFilter);
    } else if (filterType === PollFilterType.Logs) {
      this.pollFilters[filterType].push({
        ...baseFilter,
        logFilter,
      });
    } else {
      return logger.throwError(
        `filter type [${filterType}] is not supported, expect ${Object.values(PollFilterType)}`,
        Logger.errors.INVALID_ARGUMENT
      );
    }

    return id;
  };

  _pollLogs = async (filterInfo: LogPollFilter): Promise<Log[]> => {
    const curBlockNumber = await this.getBlockNumber();
    const { fromBlock = 'latest', toBlock = 'latest' } = filterInfo.logFilter;

    const UNSUPPORTED_TAGS = ['pending', 'finalized', 'safe'] as any[];
    if (UNSUPPORTED_TAGS.includes(fromBlock) || UNSUPPORTED_TAGS.includes(toBlock)) {
      return logger.throwArgumentError('pending/finalized/safe logs not supported', 'fromBlock / toBlock', {
        fromBlock,
        toBlock,
      });
    }

    const sanitizedFilter = await this._sanitizeRawFilter(filterInfo.logFilter);

    /* ---------------
       compute the configuration filter range
       in this context we treat 'latest' blocktag in *rawFilter* as trivial filter
       i.e. default fromBlock and toBlock are both 'latest', which filters nothing
                                                                   --------------- */
    const from = fromBlock === 'latest' ? 0 : sanitizedFilter.fromBlock ?? 0;
    const to = toBlock === 'latest' ? 999999999 : sanitizedFilter.toBlock ?? 999999999;

    /* ---------------
       combine configuration filter range [from, to] and
       dynamic data range [lastPollBlockNumber + 1, curBlockNumber]
       as the final effective range to query
                                                    --------------- */
    const effectiveFrom = Math.max(from, filterInfo.lastPollBlockNumber + 1);
    const effectiveTo = Math.min(to, curBlockNumber);
    if (effectiveFrom > effectiveTo) {
      return [];
    }

    const effectiveFilter = {
      ...sanitizedFilter,
      fromBlock: effectiveFrom,
      toBlock: effectiveTo,
    };

    filterInfo.lastPollBlockNumber = curBlockNumber;
    filterInfo.lastPollTimestamp = Date.now();

    const logs = await this.getLogs(effectiveFilter);
    const formattedLogs = logs.map(log => this.formatter.filterLog(log));

    return hexlifyRpcResult(formattedLogs);
  };

  _pollBlocks = async (filterInfo: BlockPollFilter): Promise<string[]> => {
    const curBlockNumber = await this.getBlockNumber();

    const newBlockHashesPending: Promise<string>[] = [];
    for (let blockNum = filterInfo.lastPollBlockNumber + 1; blockNum <= curBlockNumber; blockNum++) {
      newBlockHashesPending.push(this._getBlockHash(blockNum));
    }

    filterInfo.lastPollBlockNumber = curBlockNumber;
    filterInfo.lastPollTimestamp = Date.now();

    return Promise.all(newBlockHashesPending);
  };

  poll = async (id: string, logsOnly = false): Promise<string[] | Log[]> => {
    const logFilterInfo = this.pollFilters[PollFilterType.Logs].find(f => f.id === id);
    const blockFilterInfo = !logsOnly && this.pollFilters[PollFilterType.NewBlocks].find(f => f.id === id);
    const filterInfo = logFilterInfo ?? blockFilterInfo;

    if (!filterInfo) {
      return logger.throwError('filter not found', Logger.errors.UNKNOWN_ERROR, { filterId: id });
    }

    // TODO: TS bug?? why filterInfo type is not BlockPollFilter | LogPollFilter
    return filterInfo['logFilter']
      ? this._pollLogs(filterInfo as LogPollFilter)
      : this._pollBlocks(filterInfo as BlockPollFilter);
  };

  removePollFilter = (id: string): boolean => {
    let found = false;
    Object.values(PollFilterType).forEach(f => {
      const targetIdx = this.pollFilters[f].findIndex(f => f.id === id);
      if (targetIdx !== undefined && targetIdx !== -1) {
        this.pollFilters[f].splice(targetIdx, 1);
        found = true;
      }
    });

    return found;
  };

  txpoolContent = async (): Promise<TxpoolContent> => {
    const pendingExtrinsics = await this.api.rpc.author.pendingExtrinsics();
    const pendingTxs = await Promise.all(pendingExtrinsics
      .filter(isEvmExtrinsic)
      .map(async extrinsic => {
        const from = await this.getEvmAddress(extrinsic.signer.toString());

        return {
          blockHash: null,
          blockNumber: null,
          from,
          gasPrice: 0, // hard to calculate
          hash: extrinsic.hash.toHex(),
          transactionIndex: null,
          ...parseExtrinsic(extrinsic),
        };
      }));

    const pending = pendingTxs.reduce((res, tx) => {
      res[tx.from] ??= {};
      res[tx.from][tx.nonce] = hexlifyRpcResult(tx);

      return res;
    }, {} as TxpoolContent['pending']);

    return {
      pending,
      queued: {},
    };
  };

  on = (_eventName: EventType, _listener: Listener): Provider => throwNotImplemented('on');
  once = (_eventName: EventType, _listener: Listener): Provider => throwNotImplemented('once');
  emit = (_eventName: EventType, ..._args: Array<any>): boolean => throwNotImplemented('emit');
  listenerCount = (_eventName?: EventType): number => throwNotImplemented('listenerCount');
  listeners = (_eventName?: EventType): Array<Listener> => throwNotImplemented('listeners');
  off = (_eventName: EventType, _listener?: Listener): Provider => throwNotImplemented('off');
  removeAllListeners = (_eventName?: EventType): Provider => throwNotImplemented('removeAllListeners');
}
