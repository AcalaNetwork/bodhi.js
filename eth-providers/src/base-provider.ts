import { AcalaEvmTX, checkSignatureType, parseTransaction } from '@acala-network/eth-transactions';
import { BigNumber, BigNumberish, Wallet } from 'ethers';
import { AccessListish } from 'ethers/lib/utils';
import {
  Block,
  BlockTag,
  BlockWithTransactions,
  EventType,
  FeeData,
  Listener,
  Log,
  Provider as AbstractProvider,
  Provider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse
} from '@ethersproject/abstract-provider';
import { getAddress } from '@ethersproject/address';
import { hexDataLength, hexlify, hexValue, hexZeroPad, isHexString, joinSignature } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { Network } from '@ethersproject/networks';
import { Deferrable, defineReadOnly, resolveProperties } from '@ethersproject/properties';
import { Formatter } from '@ethersproject/providers';
import { accessListify, Transaction } from '@ethersproject/transactions';
import { ApiPromise } from '@polkadot/api';
import { createHeaderExtended } from '@polkadot/api-derive';
import { VersionedRegistry } from '@polkadot/api/base/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { GenericExtrinsic, Option, UInt, decorateStorage, unwrapStorageType, Vec } from '@polkadot/types';
import { AccountId, EventRecord, Header, RuntimeVersion } from '@polkadot/types/interfaces';
import { Storage } from '@polkadot/types/metadata/decorate/types';
import { FrameSystemAccountInfo, FrameSystemEventRecord } from '@polkadot/types/lookup';
import { EvmAccountInfo, EvmContractInfo } from '@acala-network/types/interfaces';
import { hexToU8a, isNull, u8aToHex, u8aToU8a } from '@polkadot/util';
import BN from 'bn.js';
import LRUCache from 'lru-cache';

import {
  BIGNUMBER_ZERO,
  CACHE_SIZE_WARNING,
  DUMMY_ADDRESS,
  DUMMY_BLOCK_MIX_HASH,
  DUMMY_BLOCK_NONCE,
  DUMMY_LOGS_BLOOM,
  EMPTY_HEX_STRING,
  EMTPY_UNCLES,
  EMTPY_UNCLE_HASH,
  ERROR_PATTERN,
  LOCAL_MODE_MSG,
  PROD_MODE_MSG,
  RICH_MODE_WARNING_MSG,
  SAFE_MODE_WARNING_MSG,
  ZERO,
  DUMMY_V_R_S,
  DUMMY_BLOCK_HASH
} from './consts';
import {
  calcEthereumTransactionParams,
  calcSubstrateTransactionParams,
  computeDefaultEvmAddress,
  computeDefaultSubstrateAddress,
  nativeToEthDecimal,
  filterLog,
  findEvmEvent,
  getEvmExtrinsicIndexes,
  getHealthResult,
  getPartialTransactionReceipt,
  getTransactionIndexAndHash,
  HealthResult,
  hexlifyRpcResult,
  isEvmExtrinsic,
  logger,
  parseExtrinsic,
  PROVIDER_ERRORS,
  runWithRetries,
  runWithTiming,
  sendTx,
  throwNotImplemented,
  getEffectiveGasPrice,
  parseBlockTag,
  filterLogByTopics,
  getOrphanTxReceiptsFromEvents,
  BaseLogFilter,
  SanitizedLogFilter,
  LogFilter,
  checkEvmExecutionError
} from './utils';
import { BlockCache, CacheInspect } from './utils/BlockCache';
import { TransactionReceipt as TransactionReceiptGQL, _Metadata } from './utils/gqlTypes';
import { SubqlProvider } from './utils/subqlProvider';

export interface Eip1898BlockTag {
  blockNumber: string | number;
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

  transactions: `0x${string}`[];

  // baseFeePerGas: BIGNUMBER_ZERO,
  // with baseFeePerGas Metamask will send token with EIP-1559 format
  // but we want it to send with legacy format
}

export interface FullBlockData extends Omit<BlockData, 'transactions'> {
  transactions: TX[];
}

export type Numberish = bigint | string | number;

export interface SubstrateEvmCallRequest {
  from?: string;
  to?: string;
  gasLimit?: Numberish;
  storageLimit?: Numberish;
  value?: Numberish;
  data?: string;
  accessList?: AccessListish;
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
  confirmations: number;
  cumulativeGasUsed: BigNumber;
  effectiveGasPrice: BigNumber;
  type: number;
  status?: number;
}

export interface GasConsts {
  storageDepositPerByte: bigint;
  txFeePerGas: bigint;
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
  richMode?: boolean;
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

export interface CallInfo {
  ok?: {
    exit_reason: {
      succeed?: 'Stopped' | 'Returned' | 'Suicided';
      error?: any;
      revert?: 'Reverted';
      fatal?: any;
    };
    value: string;
    used_gas: number;
    used_storage: number;
    logs: Log[];
  };
  err?: {
    module: {
      index: number;
      error: `0x${string}`;
    };
  };
}

export abstract class BaseProvider extends AbstractProvider {
  readonly _api?: ApiPromise;
  readonly formatter: Formatter;
  readonly _listeners: EventListeners;
  readonly _pollFilters: PollFilters;
  readonly safeMode: boolean;
  readonly localMode: boolean;
  readonly richMode: boolean;
  readonly verbose: boolean;
  readonly subql?: SubqlProvider;
  readonly maxBlockCacheSize: number;
  readonly storages: WeakMap<VersionedRegistry<'promise'>, Storage> = new WeakMap();
  readonly _storageCache: LRUCache<string, Uint8Array | null>;
  readonly _healthCheckBlockDistance: number; // Distance allowed to fetch old nth block (since most oldest block takes longer to fetch)

  _network?: Promise<Network>;
  _cache?: BlockCache;
  _latestFinalizedBlockHash: string;
  latestFinalizedBlockNumber: number;
  runtimeVersion: number | undefined;

  constructor({
    safeMode = false,
    localMode = false,
    richMode = false,
    verbose = false,
    subqlUrl,
    maxBlockCacheSize = 200,
    storageCacheSize = 5000,
    healthCheckBlockDistance = 100
  }: BaseProviderOptions = {}) {
    super();
    this.formatter = new Formatter();
    this._listeners = { [SubscriptionType.NewHeads]: [], [SubscriptionType.Logs]: [] };
    this._pollFilters = { [PollFilterType.NewBlocks]: [], [PollFilterType.Logs]: [] };
    this.safeMode = safeMode;
    this.localMode = localMode;
    this.richMode = richMode;
    this.verbose = verbose;
    this._latestFinalizedBlockHash = DUMMY_BLOCK_HASH;
    this.latestFinalizedBlockNumber = 0;
    this.maxBlockCacheSize = maxBlockCacheSize;
    this._storageCache = new LRUCache({ max: storageCacheSize });
    this._healthCheckBlockDistance = healthCheckBlockDistance;

    richMode && logger.warn(RICH_MODE_WARNING_MSG);
    safeMode && logger.warn(SAFE_MODE_WARNING_MSG);
    this.verbose && logger.warn(localMode ? LOCAL_MODE_MSG : PROD_MODE_MSG);

    if (subqlUrl) {
      this.subql = new SubqlProvider(subqlUrl);
    }
  }

  startSubscription = async (): Promise<any> => {
    this._cache = new BlockCache(this.maxBlockCacheSize);

    if (this.maxBlockCacheSize < 0) {
      return logger.throwError(
        `expect maxBlockCacheSize >= 0, but got ${this.maxBlockCacheSize}`,
        Logger.errors.INVALID_ARGUMENT
      );
    } else {
      this.maxBlockCacheSize > 9999 && logger.warn(CACHE_SIZE_WARNING);
    }

    await this.isReady();

    const subscriptionMethod = this.safeMode
      ? this.api.rpc.chain.subscribeFinalizedHeads.bind(this)
      : this.api.rpc.chain.subscribeNewHeads.bind(this);

    subscriptionMethod(async (header: Header) => {
      // cache
      const blockNumber = header.number.toNumber();
      const blockHash = (await this.api.rpc.chain.getBlockHash(blockNumber)).toHex();
      const txHashes = await this._getTxHashesAtBlock(blockHash);

      this._cache!.addTxsAtBlock(blockNumber, txHashes);

      // eth_subscribe
      // TODO: can do some optimizations
      if (this._listeners[SubscriptionType.NewHeads].length > 0) {
        const block = await this.getBlockData(blockNumber, false);
        const response = hexlifyRpcResult(block);
        this._listeners[SubscriptionType.NewHeads].forEach((l) => l.cb(response));
      }

      if (this._listeners[SubscriptionType.Logs].length > 0) {
        const block = await this.getBlockData(blockNumber, false);
        const receipts = await Promise.all(
          block.transactions.map((tx) => this.getTransactionReceiptAtBlock(tx as string, blockNumber))
        );
        const logs = receipts.map((r) => r.logs).flat();

        this._listeners[SubscriptionType.Logs].forEach(({ cb, filter }) => {
          const filteredLogs = logs.filter((l) => filterLog(l, filter));
          const response = hexlifyRpcResult(filteredLogs);
          response.forEach((log: any) => cb(log));
        });
      }
    }) as unknown as void;

    this.api.rpc.chain.subscribeFinalizedHeads(async (header: Header) => {
      const blockNumber = header.number.toNumber();
      this.latestFinalizedBlockNumber = blockNumber;

      const blockHash = (await this.api.rpc.chain.getBlockHash(blockNumber)).toHex();
      this._latestFinalizedBlockHash = blockHash;
    }) as unknown as void;

    this.api.rpc.state.subscribeRuntimeVersion((runtime: RuntimeVersion) => {
      const version = runtime.specVersion.toNumber();
      this.verbose && logger.info(`runtime version: ${version}`);

      if (!this.runtimeVersion || this.runtimeVersion === version) {
        this.runtimeVersion = version;
      } else {
        logger.warn(
          `runtime version changed: ${this.runtimeVersion} => ${version}, shutting down myself... good bye 👋`
        );
        process?.exit(1);
      }
    }) as unknown as void;
  };

  setApi = (api: ApiPromise): void => {
    defineReadOnly(this, '_api', api);
  };

  queryStorage = async <T = any>(
    module: `${string}.${string}`,
    args: any[],
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<T> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));
    const blockHash = await this._getBlockHash(blockTag);

    const registry = await this.api.getBlockRegistry(u8aToU8a(blockHash));

    if (!this.storages.get(registry)) {
      const storage = decorateStorage(registry.registry, registry.metadata.asLatest, registry.metadata.version);
      this.storages.set(registry, storage);
    }

    const storage = this.storages.get(registry)!;

    const [section, method] = module.split('.');

    const entry = storage[section][method];
    const key = entry(...args);

    const outputType = unwrapStorageType(registry.registry, entry.meta.type, entry.meta.modifier.isOptional);

    const cacheKey = `${module}-${blockHash}-${args.join(',')}`;
    const cached = this._storageCache.get(cacheKey);

    let input: Uint8Array | null = null;

    if (cached) {
      input = cached;
    } else {
      const value: any = await this.api.rpc.state.getStorage(key, blockHash);

      const isEmpty = isNull(value);

      // we convert to Uint8Array since it maps to the raw encoding, all
      // data will be correctly encoded (incl. numbers, excl. :code)
      input = isEmpty
        ? null
        : u8aToU8a(entry.meta.modifier.isOptional ? value.toU8a() : value.isSome ? value.unwrap().toU8a() : null);

      this._storageCache.set(cacheKey, input);
    }

    const result = registry.registry.createTypeUnsafe(outputType, [input], {
      blockHash,
      isPedantic: !entry.meta.modifier.isOptional
    });

    return result as any as T;
  };

  get latestFinalizedBlockHash(): string {
    return this._latestFinalizedBlockHash === DUMMY_BLOCK_HASH // this can only happen in theory locally
      ? logger.throwError('no finalized block tracked yet...', Logger.errors.UNKNOWN_ERROR)
      : this._latestFinalizedBlockHash;
  }

  get api(): ApiPromise {
    if (!this._api) {
      return logger.throwError('the api needs to be set', Logger.errors.UNKNOWN_ERROR);
    }

    return this._api;
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

  isReady = (): Promise<Network> => {
    if (!this._network) {
      const _getNetwork = async (): Promise<{
        name: string;
        chainId: number;
      }> => {
        try {
          await this.api.isReadyOrError;

          const network = {
            name: this.api.runtimeVersion.specName.toString(),
            chainId: await this.chainId()
          };

          return network;
        } catch (e) {
          await this.api.disconnect();
          throw e;
        }
      };

      this._network = _getNetwork();
    }

    return this._network;
  };

  disconnect = async (): Promise<void> => {
    await this.api.disconnect();
  };

  getNetwork = async (): Promise<Network> => {
    const network = await this.isReady();

    return network;
  };

  netVersion = async (): Promise<string> => {
    return this.api.consts.evmAccounts.chainId.toString();
  };

  chainId = async (): Promise<number> => {
    await this.api.isReadyOrError;
    return this.api.consts.evmAccounts.chainId.toNumber();
  };

  getBlockNumber = async (): Promise<number> => {
    await this.getNetwork();
    const header = await this._getBlockHeader('latest');
    return header.number.toNumber();
  };

  _getBlock = async (_blockTag: BlockTag | Promise<BlockTag>): Promise<BlockData> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(_blockTag);
    const header = await this._getBlockHeader(blockTag);
    const blockHash = header.hash.toHex();
    const blockNumber = header.number.toNumber();

    const [block, validators, now, blockEvents] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      this.api.query.session ? this.queryStorage('session.validators', [], blockHash) : ([] as any),
      this.queryStorage('timestamp.now', [], blockHash),
      this.queryStorage<Vec<FrameSystemEventRecord>>('system.events', [], blockHash)
    ]);

    const headerExtended = createHeaderExtended(header.registry, header, validators);

    // blockscout need `toLowerCase`
    const author = headerExtended.author
      ? (await this.getEvmAddress(headerExtended.author.toString())).toLowerCase()
      : DUMMY_ADDRESS;

    const evmExtrinsicIndexes = getEvmExtrinsicIndexes(blockEvents);

    const normalTxHashes = evmExtrinsicIndexes.map((extrinsicIndex) =>
      block.block.extrinsics[extrinsicIndex].hash.toHex()
    );

    const allEvents = await this.queryStorage<Vec<FrameSystemEventRecord>>('system.events', [], blockHash);
    const virtualHashes = getOrphanTxReceiptsFromEvents(allEvents, blockHash, blockNumber, normalTxHashes.length).map(
      (r) => r.transactionHash
    );

    const alltxHashes = [...normalTxHashes, ...(virtualHashes as `0x{string}`[])];

    return {
      hash: blockHash,
      parentHash: headerExtended.parentHash.toHex(),
      number: blockNumber,
      stateRoot: headerExtended.stateRoot.toHex(),
      transactionsRoot: headerExtended.extrinsicsRoot.toHex(),
      timestamp: Math.floor(now.toNumber() / 1000),
      nonce: DUMMY_BLOCK_NONCE,
      mixHash: DUMMY_BLOCK_MIX_HASH,
      difficulty: ZERO,
      totalDifficulty: ZERO,
      gasLimit: BigNumber.from(15000000), // 15m for now. TODO: query this from blockchain
      gasUsed: BIGNUMBER_ZERO, // TODO: not full is 0

      miner: author,
      extraData: EMPTY_HEX_STRING,
      sha3Uncles: EMTPY_UNCLE_HASH,
      receiptsRoot: headerExtended.extrinsicsRoot.toHex(),
      logsBloom: DUMMY_LOGS_BLOOM, // TODO: ???
      size: block.encodedLength,
      uncles: EMTPY_UNCLES,

      transactions: alltxHashes
    };
  };

  _getFullBlock = async (blockTag: BlockTag | Promise<BlockTag>): Promise<FullBlockData> => {
    const block = await this._getBlock(blockTag);
    const transactions = await Promise.all(
      block.transactions.map((txHash) => this.getTransactionByHash(txHash) as Promise<TX>)
    );

    const gasUsed = transactions.reduce((r, tx) => r.add(tx.gas), BIGNUMBER_ZERO);

    return {
      ...block,
      transactions,
      gasUsed
    };
  };

  getBlockData = async (blockTag: BlockTag | Promise<BlockTag>, full?: boolean): Promise<BlockData | FullBlockData> => {
    return full ? this._getFullBlock(blockTag) : this._getBlock(blockTag);
  };

  getBlock = async (blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>): Promise<Block> =>
    throwNotImplemented('getBlock (please use `getBlockData` instead)');
  getBlockWithTransactions = async (
    blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>
  ): Promise<BlockWithTransactions> =>
    throwNotImplemented('getBlockWithTransactions (please use `getBlockData` instead)');

  getBalance = async (
    addressOrName: string | Promise<string>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<BigNumber> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockHash(blockTag)
    });

    const substrateAddress = await this.getSubstrateAddress(address, blockHash);

    const accountInfo = await this.queryStorage<FrameSystemAccountInfo>(
      'system.account',
      [substrateAddress],
      blockHash
    );

    return nativeToEthDecimal(accountInfo.data.free.toBigInt(), this.chainDecimal);
  };

  getTransactionCount = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<number> => {
    return this.getEvmTransactionCount(addressOrName, await parseBlockTag(blockTag));
  };

  // TODO: test pending
  getEvmTransactionCount = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<number> => {
    await this.getNetwork();

    const accountInfo = await this.queryAccountInfo(addressOrName, blockTag);

    let pendingNonce = 0;
    if ((await blockTag) === 'pending') {
      const [substrateAddress, pendingExtrinsics] = await Promise.all([
        this.getSubstrateAddress(await addressOrName),
        this.api.rpc.author.pendingExtrinsics()
      ]);

      pendingNonce = pendingExtrinsics.filter(
        (e) => isEvmExtrinsic(e) && e.signer.toString() === substrateAddress
      ).length;
    }

    const minedNonce = !accountInfo.isNone ? accountInfo.unwrap().nonce.toNumber() : 0;
    return minedNonce + pendingNonce;
  };

  getSubstrateNonce = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<number> => {
    await this.getNetwork();

    const address = await this._getAddress(addressOrName);
    const resolvedBlockTag = await blockTag;

    const substrateAddress = await this.getSubstrateAddress(address);

    if (resolvedBlockTag === 'pending') {
      const idx = await this.api.rpc.system.accountNextIndex(substrateAddress);
      return idx.toNumber();
    }

    const blockHash = await this._getBlockHash(blockTag);

    const accountInfo = await this.queryStorage('system.account', [substrateAddress], blockHash);

    return accountInfo.nonce.toNumber();
  };

  getCode = async (
    addressOrName: string | Promise<string>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<string> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    if ((await blockTag) === 'pending') return '0x';

    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockHash(blockTag)
    });

    const contractInfo = await this.queryContractInfo(address, blockHash);

    if (contractInfo.isNone) {
      return '0x';
    }

    const codeHash = contractInfo.unwrap().codeHash;

    const api = await (blockHash ? this.api.at(blockHash) : this.api);

    const code = await api.query.evm.codes(codeHash);

    return code.toHex();
  };

  call = async (
    _transaction: Deferrable<TransactionRequest>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<string> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    const { txRequest, blockHash } = await resolveProperties({
      txRequest: this._getTransactionRequest(_transaction),
      blockHash: this._getBlockHash(blockTag)
    });

    const transaction =
      txRequest.gasLimit && txRequest.gasPrice ? txRequest : { ...txRequest, ...(await this._getEthGas()) };

    const { storageLimit, gasLimit } = this._getSubstrateGasParams(transaction);

    const callRequest: SubstrateEvmCallRequest = {
      from: transaction.from,
      to: transaction.to,
      gasLimit,
      storageLimit,
      value: transaction.value?.toBigInt(),
      data: transaction.data,
      accessList: transaction.accessList
    };

    const res = await this._ethCall(callRequest, blockHash);

    return res.value;
  };

  _ethCall = async (callRequest: SubstrateEvmCallRequest, at?: string) => {
    const api = at ? await this.api.at(at) : this.api;

    const { from, to, gasLimit, storageLimit, value, data, accessList } = callRequest;
    const estimate = true;

    const res = to
      ? await api.call.evmRuntimeRPCApi.call(from, to, data, value, gasLimit, storageLimit, accessList, estimate)
      : await api.call.evmRuntimeRPCApi.create(from, data, value, gasLimit, storageLimit, accessList, estimate);

    const { ok, err } = res.toJSON() as CallInfo;
    if (!ok) {
      // substrate level error
      const errMetaValid = err?.module.index !== undefined && err?.module.error !== undefined;
      if (!errMetaValid) {
        return logger.throwError(
          'internal JSON-RPC error [unknown error - cannot decode error info from error meta]',
          Logger.errors.CALL_EXCEPTION,
          callRequest
        );
      }

      const errInfo = this.api.registry.findMetaError({
        index: new BN(err.module.index),
        error: new BN(hexToU8a(err.module.error)[0])
      });
      const msg = `internal JSON-RPC error [${errInfo.section}.${errInfo.name}: ${errInfo.docs}]`;

      return logger.throwError(msg, Logger.errors.CALL_EXCEPTION, callRequest);
    }

    // check evm level error
    checkEvmExecutionError(ok);

    return ok!;
  };

  getStorageAt = async (
    addressOrName: string | Promise<string>,
    position: BigNumberish | Promise<BigNumberish>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<string> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    const { address, blockHash, resolvedPosition } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockHash(blockTag),
      resolvedPosition: Promise.resolve(position).then((p) => hexValue(p))
    });

    const code = await this.queryStorage('evm.accountStorages', [address, hexZeroPad(resolvedPosition, 32)], blockHash);

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

  getGasPrice = async (): Promise<BigNumber> => {
    if (this.richMode) {
      return (await this._getEthGas()).gasPrice;
    }

    // tx_fee_per_gas + (current_block / 30 + 5) << 16 + 10
    const txFeePerGas = BigNumber.from((this.api.consts.evm.txFeePerGas as UInt).toBigInt());
    const currentHeader = await this.api.rpc.chain.getHeader();
    const currentBlockNumber = BigNumber.from(currentHeader.number.toBigInt());

    return txFeePerGas.add(currentBlockNumber.div(30).add(5).shl(16)).add(10);
  };

  getFeeData = async (): Promise<FeeData> => {
    return {
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      lastBaseFeePerGas: null,
      gasPrice: await this.getGasPrice()
    };
  };

  _getGasConsts = (): GasConsts => ({
    storageDepositPerByte: (this.api.consts.evm.storageDepositPerByte as UInt).toBigInt(),
    txFeePerGas: (this.api.consts.evm.txFeePerGas as UInt).toBigInt()
  });

  /**
   * Estimate gas for a transaction.
   * @param transaction The transaction to estimate the gas of
   * @returns The estimated gas used by this transaction
   */
  estimateGas = async (transaction: Deferrable<TransactionRequest>): Promise<BigNumber> => {
    await this.call(transaction);
    const { storageDepositPerByte, txFeePerGas } = this._getGasConsts();
    const gasPrice = (await transaction.gasPrice) || (await this.getGasPrice());
    const storageEntryLimit = BigNumber.from(gasPrice).and(0xffff);
    const storageEntryDeposit = BigNumber.from(storageDepositPerByte).mul(64);
    const storageGasLimit = storageEntryLimit.mul(storageEntryDeposit).div(txFeePerGas);

    const resources = await this.estimateResources(transaction);
    return resources.gas.add(storageGasLimit);
  };

  /**
   * Get the gas for eth transactions
   * @returns The gas used by eth transaction
   */
  getEthResources = async (
    transaction: Deferrable<TransactionRequest>,
    {
      gasLimit,
      storageLimit,
      validUntil
    }: {
      gasLimit?: BigNumberish;
      storageLimit?: BigNumberish;
      validUntil?: BigNumberish;
    } = {}
  ): Promise<{
    gasPrice: BigNumber;
    gasLimit: BigNumber;
  }> => {
    if (!gasLimit || !storageLimit) {
      const { gas, storage } = await this.estimateResources(transaction);
      gasLimit = gasLimit ?? gas;
      storageLimit = storageLimit ?? storage;
    }

    if (!validUntil) {
      const blockNumber = await this.getBlockNumber();
      // Expires after 100 blocks by default
      validUntil = blockNumber + 100;
    }

    const storageByteDeposit = (this.api.consts.evm.storageDepositPerByte as UInt).toBigInt();
    const txFeePerGas = (this.api.consts.evm.txFeePerGas as UInt).toBigInt();

    const { txGasLimit, txGasPrice } = calcEthereumTransactionParams({
      gasLimit,
      storageLimit,
      validUntil,
      storageByteDeposit,
      txFeePerGas
    });

    return {
      gasLimit: txGasLimit,
      gasPrice: txGasPrice
    };
  };

  /**
   * helper to get ETH gas when don't know the whole transaction
   * default to return big enough gas for contract deployment
   * @returns The gas used by eth transaction
   */
  _getEthGas = async ({
    gasLimit = 21000000,
    storageLimit = 64100,
    validUntil: _validUntil
  }: {
    gasLimit?: BigNumberish;
    storageLimit?: BigNumberish;
    validUntil?: BigNumberish;
  } = {}): Promise<{
    gasPrice: BigNumber;
    gasLimit: BigNumber;
  }> => {
    const validUntil = _validUntil || (await this.getBlockNumber()) + 150; // default 150 * 12 / 60 = 30min
    const storageByteDeposit = (this.api.consts.evm.storageDepositPerByte as UInt).toBigInt();
    const txFeePerGas = (this.api.consts.evm.txFeePerGas as UInt).toBigInt();

    const { txGasLimit, txGasPrice } = calcEthereumTransactionParams({
      gasLimit,
      storageLimit,
      validUntil,
      storageByteDeposit,
      txFeePerGas
    });

    return {
      gasLimit: txGasLimit,
      gasPrice: txGasPrice
    };
  };

  /**
   * Validate substrate transaction parameters
   */
  validSubstrateResources = ({
    gasLimit,
    gasPrice
  }: {
    gasLimit: BigNumberish;
    gasPrice: BigNumberish;
  }): {
    gasLimit: BigNumber;
    storageLimit: BigNumber;
    validUntil: BigNumber;
  } => {
    const storageByteDeposit = (this.api.consts.evm.storageDepositPerByte as UInt).toBigInt();
    const txFeePerGas = (this.api.consts.evm.txFeePerGas as UInt).toBigInt();

    return calcSubstrateTransactionParams({
      txGasPrice: gasPrice,
      txGasLimit: gasLimit,
      storageByteDeposit,
      txFeePerGas
    });
  };

  /**
   * Estimate resources for a transaction.
   * @param transaction The transaction to estimate the resources of
   * @returns The estimated resources used by this transaction
   */
  estimateResources = async (
    transaction: Deferrable<TransactionRequest>
  ): Promise<{
    gas: BigNumber;
    storage: BigNumber;
  }> => {
    // TODO: get these from chain to be more precise
    const MAX_GAS_LIMIT = 21000000;
    const MIN_GAS_LIMIT = 21000;
    const MAX_STORAGE_LIMIT = 640000;

    const _txRequest = await this._getTransactionRequest(transaction);
    const txRequest = {
      ..._txRequest,
      value: BigNumber.isBigNumber(_txRequest.value) ? _txRequest.value.toBigInt() : _txRequest.value,
      gasLimit: MAX_GAS_LIMIT,
      storageLimit: MAX_STORAGE_LIMIT
    };

    const { used_gas: usedGas, used_storage: usedStorage } = await this._ethCall(txRequest);

    // binary search the best passing gasLimit
    let lowest = MIN_GAS_LIMIT;
    let highest = MAX_GAS_LIMIT;
    let mid = Math.min(usedGas * 3, Math.floor((lowest + highest) / 2));
    let prevHighest = highest;
    while (highest - lowest > 1) {
      try {
        await this._ethCall({
          ...txRequest,
          gasLimit: mid
        });
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

    return {
      gas: BigNumber.from(highest),
      storage: BigNumber.from(usedStorage)
    };
  };

  getSubstrateAddress = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockHash(blockTag)
    });

    const substrateAccount = await this.queryStorage<Option<AccountId>>('evmAccounts.accounts', [address], blockHash);

    return substrateAccount.isEmpty ? computeDefaultSubstrateAddress(address) : substrateAccount.toString();
  };

  getEvmAddress = async (
    substrateAddress: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    substrateAddress = await substrateAddress;

    const { blockHash } = await resolveProperties({
      blockHash: this._getBlockHash(blockTag)
    });

    const apiAt = await this.api.at(blockHash);

    const evmAddress = await apiAt.query.evmAccounts.evmAddresses(substrateAddress);

    return getAddress(evmAddress.isEmpty ? computeDefaultEvmAddress(substrateAddress) : evmAddress.toString());
  };

  queryAccountInfo = async (
    addressOrName: string | Promise<string>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<Option<EvmAccountInfo>> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    // pending tag
    const resolvedBlockTag = await blockTag;
    if (resolvedBlockTag === 'pending') {
      const address = await this._getAddress(addressOrName);
      return this.api.query.evm.accounts<Option<EvmAccountInfo>>(address);
    }

    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockHash(blockTag)
    });

    const accountInfo = await this.queryStorage<Option<EvmAccountInfo>>('evm.accounts', [address], blockHash);

    return accountInfo;
  };

  queryContractInfo = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<Option<EvmContractInfo>> => {
    const accountInfo = await this.queryAccountInfo(addressOrName, blockTag);

    if (accountInfo.isNone) {
      return this.api.createType<Option<EvmContractInfo>>('Option<EvmContractInfo>', null);
    }

    return accountInfo.unwrap().contractInfo;
  };

  _getSubstrateGasParams = (
    ethTx: Partial<AcalaEvmTX>
  ): {
    gasLimit: bigint;
    storageLimit: bigint;
    validUntil: bigint;
    tip: bigint;
    accessList?: [string, string[]][];
  } => {
    let gasLimit = 0n;
    let storageLimit = 0n;
    let validUntil = 0n;
    let tip = 0n;

    if (ethTx.type === 96) {
      // EIP-712 transaction
      if (!ethTx.gasLimit) return logger.throwError('expect gasLimit');
      if (!ethTx.storageLimit) return logger.throwError('expect storageLimit');
      if (!ethTx.validUntil) return logger.throwError('expect validUntil');
      if (!ethTx.tip) return logger.throwError('expect priorityFee (tip)');

      gasLimit = ethTx.gasLimit.toBigInt();
      storageLimit = BigInt(ethTx.storageLimit.toString());
      validUntil = BigInt(ethTx.validUntil.toString());
      tip = BigInt(ethTx.tip.toString());
    } else if (ethTx.type === null || ethTx.type === undefined || ethTx.type === 0 || ethTx.type === 2) {
      // Legacy, EIP-155, and EIP-1559 transaction
      const { storageDepositPerByte, txFeePerGas } = this._getGasConsts();

      const _getErrInfo = (): any => ({
        txGasLimit: ethTx.gasLimit?.toBigInt(),
        txGasPrice: ethTx.gasPrice?.toBigInt(),
        maxPriorityFeePerGas: ethTx.maxPriorityFeePerGas?.toBigInt(),
        maxFeePerGas: ethTx.maxFeePerGas?.toBigInt(),
        txFeePerGas,
        storageDepositPerByte
      });

      const errHelpMsg =
        'invalid ETH gasLimit/gasPrice combination provided. Please DO NOT change gasLimit/gasPrice in metamask when sending token, if you are deploying contract, DO NOT provide random gasLimit/gasPrice, please check out our doc for how to compute gas, easiest way is to call eth_getEthGas directly';

      try {
        const params = calcSubstrateTransactionParams({
          txGasPrice: ethTx.maxFeePerGas || ethTx.gasPrice || '0',
          txGasLimit: ethTx.gasLimit || '0',
          storageByteDeposit: storageDepositPerByte,
          txFeePerGas: txFeePerGas
        });

        gasLimit = params.gasLimit.toBigInt();
        validUntil = params.validUntil.toBigInt();
        storageLimit = params.storageLimit.toBigInt();
        tip = (ethTx.maxPriorityFeePerGas?.toBigInt() || 0n) * gasLimit;
      } catch {
        return logger.throwError(
          `calculating substrate gas failed: ${errHelpMsg}`,
          Logger.errors.INVALID_ARGUMENT,
          _getErrInfo()
        );
      }

      if (gasLimit < 0n || validUntil < 0n || storageLimit < 0n) {
        return logger.throwError(`bad substrate gas params caused by ${errHelpMsg}`, Logger.errors.INVALID_ARGUMENT, {
          ..._getErrInfo(),
          gasLimit,
          validUntil,
          storageLimit
        });
      }
    } else if (ethTx.type === 1) {
      // EIP-2930 transaction
      return throwNotImplemented('EIP-2930 transactions');
    }

    const accessList = ethTx.accessList?.map((set) => [set.address, set.storageKeys] as [string, string[]]);

    return {
      gasLimit,
      storageLimit,
      validUntil,
      tip,
      accessList
    };
  };

  prepareTransaction = async (
    rawTx: string
  ): Promise<{
    extrinsic: SubmittableExtrinsic<'promise'>;
    transaction: AcalaEvmTX;
  }> => {
    await this.getNetwork();

    const signatureType = checkSignatureType(rawTx);
    const ethTx = parseTransaction(rawTx);

    if (!ethTx.from) {
      return logger.throwError('missing from address', Logger.errors.INVALID_ARGUMENT, ethTx);
    }

    const { storageLimit, validUntil, gasLimit, tip, accessList } = this._getSubstrateGasParams(ethTx);

    // check excuted error
    const callRequest: SubstrateEvmCallRequest = {
      from: ethTx.from,
      to: ethTx.to,
      gasLimit: gasLimit,
      storageLimit: storageLimit,
      value: ethTx.value.toString(),
      data: ethTx.data,
      accessList: ethTx.accessList
    };

    await this._ethCall(callRequest);

    const extrinsic = this.api.tx.evm.ethCall(
      ethTx.to ? { Call: ethTx.to } : { Create: null },
      ethTx.data,
      ethTx.value.toString(),
      gasLimit,
      storageLimit,
      // @ts-ignore @TODO fix type
      accessList || [],
      validUntil
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
      tip
    });

    return {
      extrinsic,
      transaction: ethTx
    };
  };

  sendRawTransaction = async (rawTx: string): Promise<string> => {
    const { extrinsic } = await this.prepareTransaction(rawTx);

    await extrinsic.send();

    return extrinsic.hash.toHex();
  };

  sendTransaction = async (signedTransaction: string | Promise<string>): Promise<TransactionResponse> => {
    await this.getNetwork();
    const hexTx = await Promise.resolve(signedTransaction).then((t) => hexlify(t));
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
              transactionHash: tx.hash
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

    result.timestamp = Math.floor((await this.queryStorage('timestamp.now', [], result.blockHash)).toNumber() / 1000);

    result.wait = async (confirms?: number, timeout?: number) => {
      if (confirms === null || confirms === undefined) {
        confirms = 1;
      }
      if (timeout === null || timeout === undefined) {
        timeout = 0;
      }

      return new Promise((resolve, reject) => {
        const cancelFuncs: Array<() => void> = [];

        let done = false;

        const alreadyDone = function (): boolean {
          if (done) {
            return true;
          }
          done = true;
          cancelFuncs.forEach((func) => {
            func();
          });
          return false;
        };

        this.api.rpc.chain
          .subscribeNewHeads((head) => {
            const blockNumber = head.number.toNumber();

            if ((confirms as number) <= blockNumber - startBlock + 1) {
              const receipt = this.getTransactionReceiptAtBlock(hash, startBlockHash);
              if (alreadyDone()) {
                return;
              }
              resolve(receipt);
            }
          })
          .then((unsubscribe) => {
            cancelFuncs.push(() => {
              unsubscribe();
            });
          })
          .catch((error) => {
            reject(error);
          });

        if (typeof timeout === 'number' && timeout > 0) {
          const timer = setTimeout(() => {
            if (alreadyDone()) {
              return;
            }
            reject(logger.makeError('timeout exceeded', Logger.errors.TIMEOUT, { timeout: timeout }));
          }, timeout);

          if (timer.unref) {
            timer.unref();
          }

          cancelFuncs.push(() => {
            clearTimeout(timer);
          });
        }
      });
    };

    return result;
  };

  _getBlockNumberFromTag = async (blockTag: BlockTag): Promise<number> => {
    switch (blockTag) {
      case 'pending': {
        return logger.throwError('pending tag not implemented', Logger.errors.UNSUPPORTED_OPERATION);
      }
      case 'latest': {
        return this.getBlockNumber();
      }
      case 'earliest': {
        return 0;
      }
      case 'finalized':
      case 'safe': {
        return this.latestFinalizedBlockNumber;
      }
      default: {
        if (isHexString(blockTag) || typeof blockTag === 'number') {
          return BigNumber.from(blockTag).toNumber();
        }

        return logger.throwArgumentError(
          "blocktag should be number | hex string | 'latest' | 'earliest' | 'finalized' | 'safe'",
          'blockTag',
          blockTag
        );
      }
    }
  };

  _getBlockHash = async (_blockTag?: BlockTag | Promise<BlockTag>): Promise<string> => {
    const blockTag = (await _blockTag) || 'latest';

    switch (blockTag) {
      case 'pending': {
        return logger.throwError('pending tag not implemented', Logger.errors.UNSUPPORTED_OPERATION);
      }
      case 'latest': {
        return this.safeMode ? this.latestFinalizedBlockHash : (await this.api.rpc.chain.getBlockHash()).toHex();
      }
      case 'earliest': {
        const hash = this.api.genesisHash;
        return hash.toHex();
      }
      case 'finalized':
      case 'safe': {
        return this.latestFinalizedBlockHash;
      }
      default: {
        let blockHash: undefined | string = undefined;

        if (isHexString(blockTag, 32)) {
          blockHash = blockTag as string;
        } else if (isHexString(blockTag) || typeof blockTag === 'number') {
          const blockNumber = BigNumber.from(blockTag);

          // max blockNumber is u32
          if (blockNumber.gt(0xffffffff)) {
            return logger.throwArgumentError('block number should be less than u32', 'blockNumber', blockNumber);
          }

          const isFinalized = this.latestFinalizedBlockNumber && blockNumber.lte(this.latestFinalizedBlockNumber);
          const cacheKey = `blockHash-${blockNumber.toString()}`;

          if (isFinalized) {
            const cached = this._storageCache.get(cacheKey);
            if (cached) {
              return u8aToHex(cached);
            }
          }

          const _blockHash = await this.api.rpc.chain.getBlockHash(blockNumber.toBigInt());

          if (_blockHash.isEmpty) {
            //@ts-ignore
            return logger.throwError('header not found', PROVIDER_ERRORS.HEADER_NOT_FOUND, { blockNumber });
          }

          blockHash = _blockHash.toHex();

          if (isFinalized) {
            this._storageCache.set(cacheKey, _blockHash.toU8a());
          }
        }

        if (!blockHash) {
          return logger.throwArgumentError('blocktag should be a hex string or number', 'blockTag', blockTag);
        }

        return blockHash;
      }
    }
  };

  _isBlockFinalized = async (blockTag: BlockTag): Promise<boolean> => {
    let isFinalized = false;
    const [finalizedHead, verifyingBlockHash] = await Promise.all([
      this.api.rpc.chain.getFinalizedHead(),
      this._getBlockHash(blockTag)
    ]);

    const [finalizedBlockNumber, verifyingBlockNumber] = (
      await Promise.all([this.api.rpc.chain.getHeader(finalizedHead), this.api.rpc.chain.getHeader(verifyingBlockHash)])
    ).map((header) => header.number.toNumber());

    if (finalizedBlockNumber >= verifyingBlockNumber) {
      const canonicalHash = await this.api.rpc.chain.getBlockHash(verifyingBlockNumber);
      isFinalized = canonicalHash.toString() === verifyingBlockHash;
    }

    return isFinalized;
  };

  _isTransactionFinalized = async (txHash: string): Promise<boolean> => {
    const tx = await this._getMinedTXReceipt(txHash);
    if (!tx) return false;

    return this._isBlockFinalized(tx.blockHash);
  };

  _ensureSafeModeBlockTagFinalization = async (_blockTag: BlockTagish): Promise<BlockTagish> => {
    if (!this.safeMode || !_blockTag) return _blockTag;

    const blockTag = await _blockTag;
    if (blockTag === 'latest') return this.latestFinalizedBlockHash;

    const isBlockFinalized = await this._isBlockFinalized(blockTag);

    return isBlockFinalized
      ? blockTag
      : // We can also throw header not found error here, which is more consistent with actual block not found error. However, This error is more informative.
        logger.throwError('SAFE MODE ERROR: target block is not finalized', Logger.errors.UNKNOWN_ERROR, { blockTag });
  };

  _getBlockHeader = async (blockTag?: BlockTag | Promise<BlockTag>): Promise<Header> => {
    const blockHash = await this._getBlockHash(blockTag);

    try {
      const header = await this.api.rpc.chain.getHeader(blockHash);

      return header;
    } catch (error) {
      if (
        typeof error === 'object' &&
        typeof (error as any).message === 'string' &&
        (error as any).message.match(/Unable to retrieve header and parent from supplied hash/gi)
      ) {
        //@ts-ignore
        return logger.throwError('header not found', PROVIDER_ERRORS.HEADER_NOT_FOUND, { blockHash });
      }

      throw error;
    }
  };

  _getAddress = async (addressOrName: string | Promise<string>): Promise<string> => {
    addressOrName = await addressOrName;
    return addressOrName;
  };

  _getTransactionRequest = async (transaction: Deferrable<TransactionRequest>): Promise<Partial<Transaction>> => {
    const values: any = await transaction;

    const tx: any = {};

    ['from', 'to'].forEach((key) => {
      if (values[key] === null || values[key] === undefined) {
        return;
      }
      tx[key] = Promise.resolve(values[key]).then((v) => (v ? this._getAddress(v) : null));
    });

    ['gasLimit', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'value'].forEach((key) => {
      if (values[key] === null || values[key] === undefined) {
        return;
      }
      tx[key] = Promise.resolve(values[key]).then((v) => (v ? BigNumber.from(v) : null));
    });

    ['type'].forEach((key) => {
      if (values[key] === null || values[key] === undefined) {
        return;
      }
      tx[key] = Promise.resolve(values[key]).then((v) => (v !== null || v !== undefined ? v : null));
    });

    if (values.accessList) {
      tx.accessList = accessListify(values.accessList);
    }

    ['data'].forEach((key) => {
      if (values[key] === null || values[key] === undefined) {
        return;
      }
      tx[key] = Promise.resolve(values[key]).then((v) => (v ? hexlify(v) : null));
    });

    return resolveProperties(tx);
  };

  _getTxHashesAtBlock = async (blockHash: string): Promise<string[]> => {
    const block = await this.api.rpc.chain.getBlock(blockHash);
    const normalTxHashes = block.block.extrinsics.map((e) => e.hash.toHex());

    const orphanLogs = await this.getOrphanLogsAtBlock(blockHash);
    const virtualHashes = [...new Set(orphanLogs.map((log) => log.transactionHash))];

    return [...normalTxHashes, ...virtualHashes];
  };

  _parseTxAtBlock = async (
    blockHash: string,
    targetTx: string | number
  ): Promise<{
    extrinsic: GenericExtrinsic;
    extrinsicEvents: EventRecord[];
    transactionHash: string;
    transactionIndex: number;
    isExtrinsicFailed: boolean;
  }> => {
    const [block, blockEvents] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      this.queryStorage<Vec<FrameSystemEventRecord>>('system.events', [], blockHash)
    ]);

    const { transactionHash, transactionIndex, extrinsicIndex, isExtrinsicFailed } = getTransactionIndexAndHash(
      targetTx,
      block.block.extrinsics,
      blockEvents
    );

    const extrinsicEvents = blockEvents.filter(
      (event) => event.phase.isApplyExtrinsic && event.phase.asApplyExtrinsic.toNumber() === extrinsicIndex
    );

    return {
      extrinsic: block.block.extrinsics[extrinsicIndex],
      extrinsicEvents,
      transactionHash,
      transactionIndex,
      isExtrinsicFailed
    };
  };

  getTransactionReceiptAtBlock = async (
    hashOrNumber: number | string | Promise<string>,
    _blockTag: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<TransactionReceipt> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));
    hashOrNumber = await hashOrNumber;

    const header = await this._getBlockHeader(blockTag);
    const blockHash = header.hash.toHex();

    // TODO: maybe should query normalReceipt first, since it's much more usual
    const [normalReceipt, orphanReceipt] = await Promise.allSettled([
      this.getNormalTxReceiptAtBlock(hashOrNumber, blockHash),
      this.getOrphanTxReceiptAtBlock(hashOrNumber, blockHash)
    ]);

    if (normalReceipt.status === 'fulfilled') {
      return normalReceipt.value;
    } else if (orphanReceipt.status === 'fulfilled' && orphanReceipt.value) {
      return orphanReceipt.value;
    } else {
      return logger.throwError('<getTransactionReceiptAtBlock> receipt not found');
    }
  };

  getOrphanTxReceiptAtBlock = async (
    hashOrNumber: number | string,
    blockHash: string
  ): Promise<TransactionReceipt | null> => {
    const [block, allEvents] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      this.queryStorage<Vec<FrameSystemEventRecord>>('system.events', [], blockHash)
    ]);

    const blockNumber = block.block.header.number.toNumber();
    const evmTxCount = block.block.extrinsics.filter(isEvmExtrinsic).length;

    const orphanReceipts = getOrphanTxReceiptsFromEvents(allEvents, blockHash, blockNumber, evmTxCount);
    const targetReceipt = orphanReceipts.find(
      (r, idx) => (typeof hashOrNumber === 'string' && r.transactionHash === hashOrNumber) || idx === hashOrNumber
    );

    if (!targetReceipt) return null;

    return {
      ...targetReceipt,
      confirmations: (await this.getBlockNumber()) - blockNumber,
      effectiveGasPrice: BIGNUMBER_ZERO
    };
  };

  getNormalTxReceiptAtBlock = async (hashOrNumber: number | string, blockHash: string): Promise<TransactionReceipt> => {
    const blockNumber = (await this._getBlockHeader(blockHash)).number.toNumber();

    const { extrinsic, extrinsicEvents, transactionIndex, transactionHash, isExtrinsicFailed } =
      await this._parseTxAtBlock(blockHash, hashOrNumber);

    const systemEvent = extrinsicEvents.find((event) =>
      ['ExtrinsicSuccess', 'ExtrinsicFailed'].includes(event.event.method)
    );

    if (!systemEvent) {
      return logger.throwError('<getTransactionReceiptAtBlock> find system event failed', Logger.errors.UNKNOWN_ERROR, {
        hash: transactionHash,
        blockHash
      });
    }

    if (isExtrinsicFailed) {
      const [dispatchError] = extrinsicEvents[extrinsicEvents.length - 1].event.data as any[];

      let message = dispatchError.type;

      if (dispatchError.isModule) {
        try {
          const mod = dispatchError.asModule;
          const error = this.api.registry.findMetaError(new Uint8Array([mod.index.toNumber(), mod.error.toNumber()]));
          message = `${error.section}.${error.name}: ${error.docs}`;
        } catch (error) {
          // swallow
        }
      }

      return logger.throwError(`ExtrinsicFailed: ${message}`, Logger.errors.UNKNOWN_ERROR, {
        hash: transactionHash,
        blockHash
      });
    }

    const { weight: actualWeight } = (systemEvent.event.data.toJSON() as any)[0]; // TODO: fix type

    const evmEvent = findEvmEvent(extrinsicEvents);
    if (!evmEvent) {
      return logger.throwError('findEvmEvent failed', Logger.errors.UNKNOWN_ERROR, {
        blockNumber,
        tx: hashOrNumber
      });
    }

    // TODO: `getEffectiveGasPrice` and `getPartialTransactionReceipt` can potentially be merged and refactored
    const effectiveGasPrice = await getEffectiveGasPrice(
      evmEvent,
      this.api,
      blockHash,
      extrinsic,
      actualWeight.refTime ?? actualWeight
    );
    const partialTransactionReceipt = getPartialTransactionReceipt(evmEvent);

    const transactionInfo = { transactionIndex, blockHash, transactionHash, blockNumber };

    // to and contractAddress may be undefined
    return this.formatter.receipt({
      effectiveGasPrice,
      confirmations: (await this.getBlockNumber()) - blockNumber,
      ...transactionInfo,
      ...partialTransactionReceipt,
      logs: partialTransactionReceipt.logs.map((log) => ({
        ...transactionInfo,
        ...log
      }))
    });
  };

  static isProvider(value: any): value is Provider {
    return !!(value && value._isProvider);
  }

  _getTxReceiptFromCache = async (txHash: string): Promise<TransactionReceipt | null> => {
    const targetBlockNumber = this._cache?.getBlockNumber(txHash);
    if (!targetBlockNumber) return null;

    let targetBlockHash;
    try {
      targetBlockHash = await this.api.rpc.chain.getBlockHash(targetBlockNumber);
    } catch (e) {
      // this should only happen in local mode when head subscription notification
      // is faster than node new head setup
      return null;
    }

    return this.getTransactionReceiptAtBlock(txHash, targetBlockHash.toHex());
  };

  // TODO: test pending
  _getPendingTX = async (txHash: string): Promise<TX | null> => {
    const pendingExtrinsics = await this.api.rpc.author.pendingExtrinsics();
    const targetExtrinsic = pendingExtrinsics.find((e) => e.hash.toHex() === txHash);

    if (!(targetExtrinsic && isEvmExtrinsic(targetExtrinsic))) return null;

    return {
      from: await this.getEvmAddress(targetExtrinsic.signer.toString()),
      blockHash: null,
      blockNumber: null,
      transactionIndex: null,
      hash: txHash,
      gasPrice: 0, // TODO: reverse calculate using args.storage_limit if needed
      ...parseExtrinsic(targetExtrinsic)
    };
  };

  _getMinedTXReceipt = async (txHash: string): Promise<TransactionReceipt | TransactionReceiptGQL | null> => {
    const txFromCache = await this._getTxReceiptFromCache(txHash);
    if (txFromCache) return txFromCache;

    const txFromSubql = await this.subql?.getTxReceiptByHash(txHash);
    const res = txFromSubql || null;
    if (res) {
      res.blockNumber = +res.blockNumber;
      res.transactionIndex = +res.transactionIndex;
      res.gasUsed = BigNumber.from(res.gasUsed);
      res.effectiveGasPrice = BigNumber.from(res.effectiveGasPrice);
    }

    return res;
  };

  // Queries
  getTransaction = (txHash: string): Promise<TransactionResponse> =>
    throwNotImplemented('getTransaction (deprecated: please use getTransactionByHash)');

  getTransactionByHash = async (txHash: string): Promise<TX | null> => {
    if (!this.localMode) {
      // local mode is for local instant-sealing node
      // so ignore pending tx to avoid some timing issue
      const pendingTX = await this._getPendingTX(txHash);
      if (pendingTX) return pendingTX;
    }

    const tx = this.localMode
      ? await runWithRetries(this._getMinedTXReceipt.bind(this), [txHash])
      : await this._getMinedTXReceipt(txHash);

    if (!tx) return null;

    let extraData;

    try {
      const { extrinsic } = await this._parseTxAtBlock(tx.blockHash, txHash);
      extraData = parseExtrinsic(extrinsic);
    } catch (e) {
      // virtual tx
      extraData = {
        value: '0x0',
        gas: 2_100_000,
        input: '0x',
        nonce: 0,
        ...DUMMY_V_R_S
      };
    }

    return {
      blockHash: tx.blockHash,
      blockNumber: tx.blockNumber,
      transactionIndex: tx.transactionIndex,
      hash: tx.transactionHash,
      from: tx.from,
      gasPrice: tx.effectiveGasPrice,
      ...extraData,

      // overrides to in parseExtrinsic, in case of non-evm extrinsic, such as dex.xxx
      to: tx.to || null
    };
  };

  getTransactionReceipt = async (txHash: string): Promise<TransactionReceipt> =>
    throwNotImplemented('getTransactionReceipt (please use `getTXReceiptByHash` instead)');

  getTXReceiptByHash = async (txHash: string): Promise<TXReceipt | null> => {
    const tx = this.localMode
      ? await runWithRetries(this._getMinedTXReceipt.bind(this), [txHash])
      : await this._getMinedTXReceipt(txHash);
    if (!tx) return null;

    return this.formatter.receipt({
      to: tx.to || null,
      from: tx.from,
      contractAddress: tx.contractAddress || null,
      transactionIndex: tx.transactionIndex,
      gasUsed: tx.gasUsed,
      logsBloom: tx.logsBloom,
      blockHash: tx.blockHash,
      transactionHash: tx.transactionHash,
      logs: Array.isArray(tx.logs) ? tx.logs : (tx.logs.nodes as Log[]),
      blockNumber: tx.blockNumber,
      cumulativeGasUsed: tx.cumulativeGasUsed,
      type: tx.type,
      status: tx.status,
      effectiveGasPrice: tx.effectiveGasPrice,
      confirmations: (await this.getBlockNumber()) - tx.blockNumber
    });
  };

  _sanitizeRawFilter = async (rawFilter: LogFilter): Promise<SanitizedLogFilter> => {
    const { fromBlock, toBlock, blockHash, address, topics } = rawFilter;
    const filter: SanitizedLogFilter = {
      address,
      topics
    };

    if (blockHash && (fromBlock || toBlock)) {
      return logger.throwError(
        '`fromBlock` and `toBlock` is not allowed in params when `blockHash` is present',
        Logger.errors.INVALID_ARGUMENT,
        {
          blockHash,
          fromBlock,
          toBlock
        }
      );
    }

    if (blockHash) {
      // eip-1898
      const blockNumber = (await this._getBlockHeader(blockHash)).number.toNumber();

      filter.fromBlock = blockNumber;
      filter.toBlock = blockNumber;
    } else {
      const fromBlockNumber = await this._getBlockNumberFromTag(fromBlock ?? 'latest');
      const toBlockNumber = await this._getBlockNumberFromTag(toBlock ?? 'latest');

      filter.fromBlock = fromBlockNumber;
      filter.toBlock = toBlockNumber;
    }

    return filter;
  };

  // Bloom-filter Queries
  getLogs = async (rawFilter: LogFilter): Promise<Log[]> => {
    if (!this.subql) {
      return logger.throwError(
        'missing subql url to fetch logs, to initialize base provider with subql, please provide a subqlUrl param.'
      );
    }

    const filter = await this._sanitizeRawFilter(rawFilter);
    const subqlLogs = await this.subql.getFilteredLogs(filter); // only filtered by blockNumber and address
    const filteredLogs = subqlLogs.filter((log) => filterLogByTopics(log, filter.topics));

    return filteredLogs.map((log) => this.formatter.filterLog(log));
  };

  // TODO: split this to getVirtualTxReceiptsAtBlock
  getOrphanLogsAtBlock = async (blockTag?: BlockTag | Promise<BlockTag>): Promise<Log[]> => {
    const blockHash = await this._getBlockHash(blockTag);
    const blockNumber = (await this._getBlockHeader(blockHash)).number.toNumber();
    const allEvents = await this.queryStorage<Vec<FrameSystemEventRecord>>('system.events', [], blockHash);

    const block = await this.api.rpc.chain.getBlock(blockHash);
    const evmTxCount = block.block.extrinsics.filter(isEvmExtrinsic).length;

    const orphanReceipts = getOrphanTxReceiptsFromEvents(allEvents, blockHash, blockNumber, evmTxCount);
    const orphanLogs = orphanReceipts.reduce<Log[]>((logs, receipt) => logs.concat(receipt.logs), []);

    return hexlifyRpcResult(orphanLogs);
  };

  getIndexerMetadata = async (): Promise<_Metadata | undefined> => {
    return this.subql?.getIndexerMetadata();
  };

  getCachInfo = (): CacheInspect | undefined => this._cache?._inspect();

  _timeEthCalls = async (): Promise<{
    gasPriceTime: number;
    estimateGasTime: number;
    getBlockTime: number;
    getFullBlockTime: number;
  }> => {
    const gasPricePromise = runWithTiming(async () => this.getGasPrice());
    const estimateGasPromise = runWithTiming(async () =>
      this.estimateGas({
        from: '0xe3234f433914d4cfcf846491ec5a7831ab9f0bb3',
        value: '0x0',
        gasPrice: '0x2f0276000a',
        data: '0x',
        to: '0x22293227a254a481883ca5e823023633308cb9ca'
      })
    );

    // ideally pastNblock should have EVM TX
    const pastNblock =
      this.latestFinalizedBlockNumber > this._healthCheckBlockDistance
        ? this.latestFinalizedBlockNumber - this._healthCheckBlockDistance
        : this.latestFinalizedBlockNumber;
    const getBlockPromise = runWithTiming(async () => this.getBlockData(pastNblock, false));
    const getFullBlockPromise = runWithTiming(async () => this.getBlockData(pastNblock, true));

    const [gasPriceTime, estimateGasTime, getBlockTime, getFullBlockTime] = (
      await Promise.all([gasPricePromise, estimateGasPromise, getBlockPromise, getFullBlockPromise])
    ).map((res) => Math.floor(res.time));

    return {
      gasPriceTime,
      estimateGasTime,
      getBlockTime,
      getFullBlockTime
    };
  };

  healthCheck = async (): Promise<HealthResult> => {
    const [indexerMeta, ethCallTiming] = await Promise.all([this.getIndexerMetadata(), this._timeEthCalls()]);

    const cacheInfo = this.getCachInfo();
    const curFinalizedHeight = this.latestFinalizedBlockNumber;
    const listenersCount = {
      newHead: this._listeners[SubscriptionType.NewHeads]?.length || 0,
      logs: this._listeners[SubscriptionType.Logs]?.length || 0
    };

    return getHealthResult({
      indexerMeta,
      cacheInfo,
      curFinalizedHeight,
      ethCallTiming,
      listenersCount
    });
  };

  // ENS
  lookupAddress = (address: string | Promise<string>): Promise<string> => throwNotImplemented('lookupAddress');

  waitForTransaction = (
    transactionHash: string,
    confirmations?: number,
    timeout?: number
  ): Promise<TransactionReceipt> => throwNotImplemented('waitForTransaction');

  // Event Emitter (ish)
  addEventListener = (eventName: string, listener: Listener, filter: any = {}): string => {
    const id = Wallet.createRandom().address;
    const eventCallBack = (data: any): void =>
      listener({
        subscription: id,
        result: data
      });

    if (eventName === SubscriptionType.NewHeads) {
      this._listeners[eventName].push({ cb: eventCallBack, id });
    } else if (eventName === SubscriptionType.Logs) {
      this._listeners[eventName].push({ cb: eventCallBack, filter, id });
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
    Object.values(SubscriptionType).forEach((e) => {
      const targetIdx = this._listeners[e].findIndex((l) => l.id === id);
      if (targetIdx !== undefined && targetIdx !== -1) {
        this._listeners[e].splice(targetIdx, 1);
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
      lastPollTimestamp: Date.now() // TODO: add expire
    };

    if (filterType === PollFilterType.NewBlocks) {
      this._pollFilters[filterType].push(baseFilter);
    } else if (filterType === PollFilterType.Logs) {
      this._pollFilters[filterType].push({
        ...baseFilter,
        logFilter
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
        toBlock
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
      toBlock: effectiveTo
    };

    if (!this.subql) {
      return logger.throwError(
        'missing subql url to fetch logs, to initialize base provider with subql, please provide a subqlUrl param.'
      );
    }

    filterInfo.lastPollBlockNumber = curBlockNumber;
    filterInfo.lastPollTimestamp = Date.now();

    const subqlLogs = await this.subql.getFilteredLogs(effectiveFilter); // FIXME: this misses unfinalized logs
    const filteredLogs = subqlLogs.filter((log) => filterLogByTopics(log, sanitizedFilter.topics));

    return hexlifyRpcResult(filteredLogs.map((log) => this.formatter.filterLog(log)));
  };

  _pollBlocks = async (filterInfo: BlockPollFilter): Promise<string[]> => {
    const curBlockNumber = await this.getBlockNumber();

    const newBlockHashes = [];
    for (let blockNum = filterInfo.lastPollBlockNumber + 1; blockNum <= curBlockNumber; blockNum++) {
      newBlockHashes.push(this._getBlockHash(blockNum));
    }

    filterInfo.lastPollBlockNumber = curBlockNumber;
    filterInfo.lastPollTimestamp = Date.now();

    return Promise.all(newBlockHashes);
  };

  poll = async (id: string, logsOnly = false): Promise<string[] | Log[]> => {
    const logFilterInfo = this._pollFilters[PollFilterType.Logs].find((f) => f.id === id);
    const blockFilterInfo = !logsOnly && this._pollFilters[PollFilterType.NewBlocks].find((f) => f.id === id);
    const filterInfo = logFilterInfo ?? blockFilterInfo;

    if (!filterInfo) {
      return logger.throwError('filter not found', Logger.errors.UNKNOWN_ERROR, { filterId: id });
    }

    // TODO: TS bug?? why filterInfo type is not BlockPollFilter | LogPollFilter
    return filterInfo.hasOwnProperty('logFilter')
      ? this._pollLogs(filterInfo as LogPollFilter)
      : this._pollBlocks(filterInfo);
  };

  removePollFilter = (id: string): boolean => {
    let found = false;
    Object.values(PollFilterType).forEach((f) => {
      const targetIdx = this._pollFilters[f].findIndex((f) => f.id === id);
      if (targetIdx !== undefined && targetIdx !== -1) {
        this._pollFilters[f].splice(targetIdx, 1);
        found = true;
      }
    });

    return found;
  };

  on = (eventName: EventType, listener: Listener): Provider => throwNotImplemented('on');
  once = (eventName: EventType, listener: Listener): Provider => throwNotImplemented('once');
  emit = (eventName: EventType, ...args: Array<any>): boolean => throwNotImplemented('emit');
  listenerCount = (eventName?: EventType): number => throwNotImplemented('listenerCount');
  listeners = (eventName?: EventType): Array<Listener> => throwNotImplemented('listeners');
  off = (eventName: EventType, listener?: Listener): Provider => throwNotImplemented('off');
  removeAllListeners = (eventName?: EventType): Provider => throwNotImplemented('removeAllListeners');
}
