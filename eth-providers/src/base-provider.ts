import { AcalaEvmTX, checkSignatureType, parseTransaction } from '@acala-network/eth-transactions';
import type { EvmAccountInfo, EvmContractInfo } from '@acala-network/types/interfaces';
import {
  Block,
  BlockWithTransactions,
  EventType,
  FeeData,
  Filter,
  FilterByBlockHash,
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
import '@polkadot/api-augment';
import { createHeaderExtended } from '@polkadot/api-derive';
import { VersionedRegistry } from '@polkadot/api/base/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import type { GenericExtrinsic, Option, UInt } from '@polkadot/types';
import { decorateStorage, unwrapStorageType, Vec } from '@polkadot/types';
import type { AccountId, EventRecord, Header, RuntimeVersion } from '@polkadot/types/interfaces';
import { FrameSystemAccountInfo, FrameSystemEventRecord } from '@polkadot/types/lookup';
import { Storage } from '@polkadot/types/metadata/decorate/types';
import { isNull, u8aToHex, u8aToU8a } from '@polkadot/util';
import type BN from 'bn.js';
import { BigNumber, BigNumberish, Wallet } from 'ethers';
import { AccessListish } from 'ethers/lib/utils';
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
  U32MAX,
  U64MAX,
  ZERO
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
  isEVMExtrinsic,
  logger,
  parseExtrinsic,
  PROVIDER_ERRORS,
  runWithRetries,
  runWithTiming,
  sendTx,
  throwNotImplemented,
  getEffectiveGasPrice,
  parseBlockTag,
  filterLogByTopics
} from './utils';
import { BlockCache, CacheInspect } from './utils/BlockCache';
import { TransactionReceipt as TransactionReceiptGQL, _Metadata } from './utils/gqlTypes';
import { SubqlProvider } from './utils/subqlProvider';

export interface Eip1898BlockTag {
  blockNumber: string | number;
  blockHash: string;
}

export type BlockTag = 'earliest' | 'latest' | 'pending' | string | number;
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

export interface CallRequest {
  from?: string;
  to?: string;
  gasLimit?: BigNumberish;
  storageLimit?: BigNumberish;
  value?: BigNumberish;
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

export interface EventListener {
  id: string;
  cb: (data: any) => void;
  filter?: any;
}

export interface EventListeners {
  [name: string]: EventListener[];
}

export interface EventData {
  [index: string]: {
    weight: number;
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

export type NewBlockListener = (header: Header) => any;

export type BlockTagish = BlockTag | Promise<BlockTag> | undefined;

const NEW_HEADS = 'newHeads';
const NEW_LOGS = 'logs';
const ALL_EVENTS = [NEW_HEADS, NEW_LOGS];

export abstract class BaseProvider extends AbstractProvider {
  readonly _api?: ApiPromise;
  readonly formatter: Formatter;
  readonly _listeners: EventListeners;
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
  latestFinalizedBlockHash: string | undefined;
  latestFinalizedBlockNumber: number | undefined;
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
    this._listeners = {};
    this.safeMode = safeMode;
    this.localMode = localMode;
    this.richMode = richMode;
    this.verbose = verbose;
    this.latestFinalizedBlockHash = undefined;
    this.latestFinalizedBlockNumber = undefined;
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

    if (this.maxBlockCacheSize < 1) {
      return logger.throwError(
        `expect maxBlockCacheSize > 0, but got ${this.maxBlockCacheSize}`,
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
      if (this._listeners[NEW_HEADS]?.length > 0) {
        const block = await this.getBlockData(blockNumber, false);
        const response = hexlifyRpcResult(block);
        this._listeners[NEW_HEADS].forEach((l) => l.cb(response));
      }

      if (this._listeners[NEW_LOGS]?.length > 0) {
        const block = await this.getBlockData(header.number.toHex(), false);
        const receipts = await Promise.all(
          block.transactions.map((tx) => this.getTransactionReceiptAtBlock(tx as string, header.number.toHex()))
        );

        const logs = receipts.map((r) => r.logs).flat();

        this._listeners[NEW_LOGS]?.forEach(({ cb, filter }) => {
          const filteredLogs = logs.filter((l) => filterLog(l, filter));
          const response = hexlifyRpcResult(filteredLogs);
          response.forEach((log: any) => cb(log));
        });
      }
    }) as unknown as void;

    this.api.rpc.chain.subscribeFinalizedHeads(async (header: Header) => {
      const blockNumber = header.number.toNumber();
      this.latestFinalizedBlockNumber = blockNumber;

      // safe mode only, if useful in the future, can remove this if condition
      if (this.safeMode) {
        const blockHash = (await this.api.rpc.chain.getBlockHash(blockNumber)).toHex();
        this.latestFinalizedBlockHash = blockHash;
      }
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
    return (this.api.consts.evmAccounts.chainId as any).toNumber();
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

    const [block, validators, now, blockEvents] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      this.api.query.session ? this.queryStorage('session.validators', [], blockHash) : ([] as any),
      this.queryStorage('timestamp.now', [], blockHash),
      this.queryStorage<Vec<FrameSystemEventRecord>>('system.events', [], blockHash)
    ]);

    const headerExtended = createHeaderExtended(header.registry, header, validators);

    const blockNumber = headerExtended.number.toNumber();

    // blockscout need `toLowerCase`
    const author = headerExtended.author
      ? (await this.getEvmAddress(headerExtended.author.toString())).toLowerCase()
      : DUMMY_ADDRESS;

    const evmExtrinsicIndexes = getEvmExtrinsicIndexes(blockEvents);

    const transactions = evmExtrinsicIndexes.map((extrinsicIndex) =>
      block.block.extrinsics[extrinsicIndex].hash.toHex()
    );

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

      transactions
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
    return full
      ? ((await this._getFullBlock(blockTag)) as FullBlockData)
      : ((await this._getBlock(blockTag)) as BlockData);
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
        (e) => isEVMExtrinsic(e) && e.signer.toString() === substrateAddress
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
    transaction: Deferrable<TransactionRequest>,
    _blockTag?: BlockTag | Promise<BlockTag> | Eip1898BlockTag
  ): Promise<string> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(await parseBlockTag(_blockTag));

    const resolved = await resolveProperties({
      transaction: this._getTransactionRequest(transaction),
      blockHash: this._getBlockHash(blockTag)
    });

    const callRequest: CallRequest = {
      from: resolved.transaction.from,
      to: resolved.transaction.to,
      gasLimit: resolved.transaction.gasLimit?.toBigInt(),
      storageLimit: undefined,
      value: resolved.transaction.value?.toBigInt(),
      data: resolved.transaction.data,
      accessList: resolved.transaction.accessList
    };

    const data = resolved.blockHash
      ? await (this.api.rpc as any).evm.call(callRequest, resolved.blockHash)
      : await (this.api.rpc as any).evm.call(callRequest);

    return data.toHex();
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

    // return await resolver.getAddress();
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
    weightFee: BigNumber;
  }> => {
    const ethTx = await this._getTransactionRequest(transaction);

    const { from, to, data, value } = ethTx;

    const accessList = ethTx.accessList?.map(({ address, storageKeys }) => [address, storageKeys]) || [];

    const extrinsic = !to
      ? this.api.tx.evm.create(
          data!,
          value?.toBigInt()!,
          U64MAX.toBigInt(), // gas_limit u64::max
          U32MAX.toBigInt(), // storage_limit u32::max
          // @ts-ignore @TODO fix type
          accessList
        )
      : this.api.tx.evm.call(
          to,
          data!,
          value?.toBigInt()!,
          U64MAX.toBigInt(), // gas_limit u64::max
          U32MAX.toBigInt(), // storage_limit u32::max
          // @ts-ignore @TODO fix type
          accessList
        );

    const result = await (this.api.rpc as any).evm.estimateResources(from, extrinsic.toHex());

    return {
      gas: BigNumber.from((result.gas as BN).toString()),
      storage: BigNumber.from((result.storage as BN).toString()),
      weightFee: BigNumber.from((result.weightFee as BN).toString())
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
    ethTx: AcalaEvmTX
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
      const _storageLimit = ethTx.storageLimit?.toString();
      const _validUntil = ethTx.validUntil?.toString();
      const _tip = ethTx.tip?.toString();

      if (!_storageLimit) {
        return logger.throwError('expect storageLimit');
      }
      if (!_validUntil) {
        return logger.throwError('expect validUntil');
      }
      if (!_tip) {
        return logger.throwError('expect priorityFee');
      }

      gasLimit = ethTx.gasLimit.toBigInt();
      storageLimit = BigInt(_storageLimit);
      validUntil = BigInt(_validUntil);
      tip = BigInt(_tip);
    } else if (ethTx.type === null || ethTx.type === undefined || ethTx.type === 0 || ethTx.type === 2) {
      // Legacy, EIP-155, and EIP-1559 transaction
      const { storageDepositPerByte, txFeePerGas } = this._getGasConsts();

      const _getErrInfo = (): any => ({
        txGasLimit: ethTx.gasLimit.toBigInt(),
        txGasPrice: ethTx.gasPrice?.toBigInt(),
        maxPriorityFeePerGas: ethTx.maxPriorityFeePerGas?.toBigInt(),
        maxFeePerGas: ethTx.maxFeePerGas?.toBigInt(),
        txFeePerGas,
        storageDepositPerByte
      });

      const err_help_msg =
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
        logger.throwError(
          `calculating substrate gas failed: ${err_help_msg}`,
          Logger.errors.INVALID_ARGUMENT,
          _getErrInfo()
        );
      }

      if (gasLimit < 0n || validUntil < 0n || storageLimit < 0n) {
        logger.throwError(`bad substrate gas params caused by ${err_help_msg}`, Logger.errors.INVALID_ARGUMENT, {
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
    const callRequest: CallRequest = {
      from: ethTx.from,
      to: ethTx.to,
      gasLimit: gasLimit,
      storageLimit: storageLimit,
      value: ethTx.value.toString(),
      data: ethTx.data,
      accessList: ethTx.accessList
    };

    await this.api.rpc.evm.call(callRequest);

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

  _getBlockHash = async (_blockTag?: BlockTag | Promise<BlockTag>): Promise<string> => {
    const blockTag = (await _blockTag) || 'latest';

    switch (blockTag) {
      case 'pending': {
        return logger.throwError('pending tag not implemented', Logger.errors.UNSUPPORTED_OPERATION);
      }
      case 'latest': {
        return this.safeMode ? this.latestFinalizedBlockHash! : (await this.api.rpc.chain.getBlockHash()).toHex();
      }
      case 'earliest': {
        const hash = this.api.genesisHash;
        return hash.toHex();
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
            return logger.throwError('header not found', PROVIDER_ERRORS.HEADER_NOT_FOUND);
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

    return await this._isBlockFinalized(tx.blockHash);
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
        return logger.throwError('header not found', PROVIDER_ERRORS.HEADER_NOT_FOUND);
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

    return await resolveProperties(tx);
  };

  _getTxHashesAtBlock = async (blockHash: string): Promise<string[]> => {
    const block = await this.api.rpc.chain.getBlock(blockHash);

    return block.block.extrinsics.map((e) => e.hash.toHex());
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
    const blockNumber = header.number.toNumber();

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

    const { weight: actualWeight } = (systemEvent.event.data.toJSON() as EventData)[0];

    const evmEvent = findEvmEvent(extrinsicEvents);
    if (!evmEvent) {
      return logger.throwError('findEvmEvent failed', Logger.errors.UNKNOWN_ERROR, {
        blockNumber,
        tx: hashOrNumber
      });
    }

    // TODO: `getEffectiveGasPrice` and `getPartialTransactionReceipt` can potentially be merged and refactored
    const effectiveGasPrice = await getEffectiveGasPrice(evmEvent, this.api, blockHash, extrinsic, actualWeight);
    const partialTransactionReceipt = getPartialTransactionReceipt(evmEvent);

    const transactionInfo = { transactionIndex, blockHash, transactionHash, blockNumber };

    // to and contractAddress may be undefined
    return this.formatter.receipt({
      effectiveGasPrice,
      confirmations: (await this._getBlockHeader('latest')).number.toNumber() - blockNumber,
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

    if (!(targetExtrinsic && isEVMExtrinsic(targetExtrinsic))) return null;

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

    const { extrinsic } = await this._parseTxAtBlock(tx.blockHash, txHash);

    return {
      blockHash: tx.blockHash,
      blockNumber: tx.blockNumber,
      transactionIndex: tx.transactionIndex,
      hash: tx.transactionHash,
      from: tx.from,
      gasPrice: tx.effectiveGasPrice,
      ...parseExtrinsic(extrinsic),

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
      confirmations: (await this._getBlockHeader('latest')).number.toNumber() - tx.blockNumber
    });
  };

  _getBlockNumberFromTag = async (blockTag: BlockTag): Promise<number> => {
    switch (blockTag) {
      case 'pending': {
        return logger.throwError('pending tag not implemented', Logger.errors.UNSUPPORTED_OPERATION);
      }
      case 'latest': {
        const header = await this.api.rpc.chain.getHeader();
        return header.number.toNumber();
      }
      case 'earliest': {
        return 0;
      }
      default: {
        if (isHexString(blockTag) || typeof blockTag === 'number') {
          return BigNumber.from(blockTag).toNumber();
        }

        return logger.throwArgumentError(
          "blocktag should be number | hex string | 'latest' | 'earliest'",
          'blockTag',
          blockTag
        );
      }
    }
  };

  // Bloom-filter Queries
  getLogs = async (rawFilter: Filter & FilterByBlockHash): Promise<Log[]> => {
    if (!this.subql) {
      return logger.throwError(
        'missing subql url to fetch logs, to initialize base provider with subql, please provide a subqlUrl param.'
      );
    }

    const { fromBlock, toBlock, blockHash } = rawFilter;
    const filter = { ...rawFilter };

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
      const blockNumber = (await this._getBlockHeader(blockHash)).number.toNumber();

      filter.fromBlock = blockNumber;
      filter.toBlock = blockNumber;
    } else {
      const fromBlockNumber = await this._getBlockNumberFromTag(fromBlock ?? 'latest');
      const toBlockNumber = await this._getBlockNumberFromTag(toBlock ?? 'latest');

      filter.fromBlock = fromBlockNumber;
      filter.toBlock = toBlockNumber;
    }

    const subqlLogs = await this.subql.getFilteredLogs(filter); // only filtered by blockNumber and address
    const filteredLogs = subqlLogs.filter((log) => filterLogByTopics(log, filter.topics));

    return filteredLogs.map((log) => this.formatter.filterLog(log));
  };

  getIndexerMetadata = async (): Promise<_Metadata | undefined> => {
    return await this.subql?.getIndexerMetadata();
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
      this.latestFinalizedBlockNumber! > this._healthCheckBlockDistance
        ? this.latestFinalizedBlockNumber! - this._healthCheckBlockDistance
        : this.latestFinalizedBlockNumber!;
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
    const curFinalizedHeight = this.latestFinalizedBlockNumber!;

    return getHealthResult({
      indexerMeta,
      cacheInfo,
      curFinalizedHeight,
      ethCallTiming
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
  addEventListener = (eventName: string, listener: Listener, filter?: any): string => {
    const id = Wallet.createRandom().address;
    const eventCallBack = (data: any): void =>
      listener({
        subscription: id,
        result: data
      });

    this._listeners[eventName] = this._listeners[eventName] || [];
    this._listeners[eventName].push({ cb: eventCallBack, filter, id });
    return id;
  };

  removeEventListener = (id: string): boolean => {
    ALL_EVENTS.forEach((e) => {
      this._listeners[e] = this._listeners[e]?.filter((l: any) => l.id !== id);
    });

    return true;
  };

  on = (eventName: EventType, listener: Listener): Provider => throwNotImplemented('on');
  once = (eventName: EventType, listener: Listener): Provider => throwNotImplemented('once');
  emit = (eventName: EventType, ...args: Array<any>): boolean => throwNotImplemented('emit');
  listenerCount = (eventName?: EventType): number => throwNotImplemented('listenerCount');
  listeners = (eventName?: EventType): Array<Listener> => throwNotImplemented('listeners');
  off = (eventName: EventType, listener?: Listener): Provider => throwNotImplemented('off');
  removeAllListeners = (eventName?: EventType): Provider => throwNotImplemented('removeAllListeners');
}
