import '@polkadot/api-augment';
import { checkSignatureType, AcalaEvmTX, parseTransaction } from '@acala-network/eth-transactions';
import type { EvmAccountInfo, EvmContractInfo } from '@acala-network/types/interfaces';
import {
  EventType,
  FeeData,
  Filter,
  Listener,
  Log,
  Provider as AbstractProvider,
  Provider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse
} from '@ethersproject/abstract-provider';
import { ethers, Wallet, BigNumber, BigNumberish } from 'ethers';
import { AccessListish } from 'ethers/lib/utils';
import { getAddress } from '@ethersproject/address';
import { hexDataLength, hexlify, hexValue, isHexString, joinSignature } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { Network } from '@ethersproject/networks';
import { Deferrable, defineReadOnly, resolveProperties } from '@ethersproject/properties';
import { Formatter } from '@ethersproject/providers';
import { accessListify, Transaction } from '@ethersproject/transactions';
import { ApiPromise } from '@polkadot/api';
import { createHeaderExtended } from '@polkadot/api-derive';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import type { GenericExtrinsic, Option, UInt } from '@polkadot/types';
import type { AccountId, Header } from '@polkadot/types/interfaces';
import { hexlifyRpcResult } from './utils';
import type BN from 'bn.js';
import {
  BIGNUMBER_ZERO,
  EFFECTIVE_GAS_PRICE,
  EMPTY_STRING,
  GAS_PRICE,
  U32MAX,
  U64MAX,
  ZERO,
  DUMMY_ADDRESS,
  DUMMY_LOGS_BLOOM,
  DUMMY_V,
  DUMMY_R,
  DUMMY_S,
  EMTPY_UNCLES,
  EMTPY_UNCLE_HASH,
  DUMMY_BLOCK_NONCE,
  DUMMY_BLOCK_MIX_HASH,
  ERC20_ABI,
  MIRRORED_TOKEN_CONTRACT,
} from './consts';
import {
  computeDefaultEvmAddress,
  computeDefaultSubstrateAddress,
  convertNativeToken,
  getPartialTransactionReceipt,
  getTransactionIndexAndHash,
  logger,
  PROVIDER_ERRORS,
  sendTx,
  throwNotImplemented,
  calcSubstrateTransactionParams,
  getEvmExtrinsicIndexes,
  findEvmEvent,
  filterLog,
  toHex,
  calcEthereumTransactionParams,
  sleep
} from './utils';
import { SubqlProvider } from './utils/subqlProvider';
import { TransactionReceipt as TransactionReceiptGQL } from './utils/gqlTypes';
import { BlockCache } from './utils/BlockCache';

export type BlockTag = 'earliest' | 'latest' | 'pending' | string | number;
export type Signature = 'Ethereum' | 'AcalaEip712' | 'Substrate';

// https://github.com/ethers-io/ethers.js/blob/master/packages/abstract-provider/src.ts/index.ts#L61
export interface _Block {
  hash: string;
  parentHash: string;
  number: number;

  timestamp: number;
  nonce: string;
  difficulty: number;
  _difficulty: BigNumber;

  gasLimit: BigNumber;
  gasUsed: BigNumber;

  miner: string;
  extraData: string;

  // eslint-disable-next-line @rushstack/no-new-null
  baseFeePerGas?: null | BigNumber;
}

export interface _RichBlock extends _Block {
  stateRoot: string;
  transactionsRoot: string;
  mixHash: string;
}

export interface RichBlock extends _RichBlock {
  transactions: Array<string>;
}

export interface BlockWithTransactions extends _RichBlock {
  transactions: Array<TransactionResponse>;
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
  to: string | null;
  blockHash: string;
  blockNumber: number;
  transactionIndex: number;
}

export interface TX extends partialTX {
  hash: string;
  nonce: number;
  value: BigNumberish;
  gasPrice: BigNumber;
  gas: BigNumberish;
  input: string;
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
  readonly subql?: SubqlProvider;

  _newBlockListeners: NewBlockListener[];
  _network?: Promise<Network>;
  _cache?: BlockCache;
  latestFinalizedBlockHash: string | undefined;

  constructor({
    safeMode = false,
    subqlUrl,
  }: {
    safeMode?: boolean,
    subqlUrl?: string,
  } = {}) {
    super();
    this.formatter = new Formatter();
    this._listeners = {};
    this._newBlockListeners = [];
    this.safeMode = safeMode;
    this.latestFinalizedBlockHash = undefined;

    safeMode && logger.warn(`
      ----------------------------- WARNING ----------------------------
      SafeMode is ON, and RPCs behave very differently than usual world!
                  To go back to normal mode, set SAFE_MODE=0
      ------------------------------------------------------------------
    `);

    if (subqlUrl) {
      this.subql = new SubqlProvider(subqlUrl);
    } else {
      logger.warn(`no subql url provided`)
    }
  }

  startSubscription = async (maxCachedSize: number = 200): Promise<any> => {
    this._cache = new BlockCache(maxCachedSize);

    if (maxCachedSize < 1) {
      return logger.throwError(`expect maxCachedSize > 0, but got ${maxCachedSize}`, Logger.errors.INVALID_ARGUMENT);
    } else {
      maxCachedSize > 9999 && logger.warn(`
        ------------------- WARNING -------------------
        Max cached blocks is big, please be cautious!
        If memory exploded, try decrease MAX_CACHE_SIZE
        -----------------------------------------------
      `);
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
        const block = await this.getBlock(blockNumber);
        const response = hexlifyRpcResult(block);
        this._listeners[NEW_HEADS].forEach((l) =>
          l.cb(
            response
          )
        );
      }

      if (this._listeners[NEW_LOGS]?.length > 0) {
        const block = await this._getBlock(header.number.toHex(), false);
        const receipts = await Promise.all(
          block.transactions.map((tx) => this.getTransactionReceiptAtBlock(tx as string, header.number.toHex()))
        );

        const logs = receipts.map((r) => r.logs).flat();

        this._listeners[NEW_LOGS]?.forEach(({ cb, filter }) => {
          const filteredLogs = logs.filter((l) => filterLog(l, filter));
          const response = hexlifyRpcResult(filteredLogs);
          response.forEach((log: any) =>
            cb(
              log,
            )
          );
        });
      }
    }) as unknown as void;

    // for getTXhashFromNextBlock
    this.api.rpc.chain.subscribeNewHeads((header: Header) => {
      this._newBlockListeners.forEach(cb => {
        try { cb(header) } catch { /* swallow */ }
      });
      this._newBlockListeners = [];
    }) as unknown as void;

    this.api.rpc.chain.subscribeFinalizedHeads(async (header: Header) => {
      const blockNumber = header.number.toNumber();

      // safe mode related
      if (this.safeMode) {
        const blockHash = (await this.api.rpc.chain.getBlockHash(blockNumber)).toHex();
        this.latestFinalizedBlockHash = blockHash;
      }

      // cache related
      this._cache!.handleFinalizedBlock(blockNumber);
    }) as unknown as void;
  };

  setApi = (api: ApiPromise): void => {
    defineReadOnly(this, '_api', api);
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
      const _getNetwork = async () => {
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
    return this.api.consts.evm.chainId.toString();
  };

  chainId = async (): Promise<number> => {
    await this.api.isReadyOrError;
    return (this.api.consts.evm.chainId as any).toNumber();
  };

  getBlockNumber = async (): Promise<number> => {
    await this.getNetwork();

    const header = await this._getBlockHeader('latest');

    return header.number.toNumber();
  };

  getBlock = async (
    blockTag: BlockTag | Promise<BlockTag>,
    full?: boolean | Promise<boolean>
  ): Promise<RichBlock> => {
    return this._getBlock(blockTag, true) as Promise<RichBlock>;
  };

  getBlockWithTransactions = async (blockTag: BlockTag | Promise<BlockTag>): Promise<BlockWithTransactions> => {
    return this._getBlock(blockTag, true) as Promise<BlockWithTransactions>;
  };

  _getBlock = async (
    _blockTag: BlockTag | Promise<BlockTag>,
    full?: boolean | Promise<boolean>
  ): Promise<RichBlock | BlockWithTransactions> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(_blockTag);

    const { fullTx, header } = await resolveProperties({
      header: this._getBlockHeader(blockTag),
      fullTx: full
    });

    const blockHash = header.hash.toHex();

    const apiAt = await this.api.at(blockHash);

    const [block, validators, now, events] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      this.api.query.session ? apiAt.query.session.validators() : ([] as any),
      apiAt.query.timestamp.now(),
      apiAt.query.system.events()
    ]);

    const headerExtended = createHeaderExtended(header.registry, header, validators);

    const blockNumber = headerExtended.number.toNumber();

    // blockscout need `toLowerCase`
    const author = headerExtended.author ? (await this.getEvmAddress(headerExtended.author.toString())).toLowerCase() : DUMMY_ADDRESS;

    const evmExtrinsicIndexes = getEvmExtrinsicIndexes(events);

    let transactions: any[];

    if (!fullTx) {
      // not full
      transactions = evmExtrinsicIndexes.map((extrinsicIndex) => {
        return block.block.extrinsics[extrinsicIndex].hash.toHex();
      });
    } else {
      // full
      transactions = await Promise.all(evmExtrinsicIndexes.map(async (extrinsicIndex, transactionIndex) => {
        const extrinsic = block.block.extrinsics[extrinsicIndex];
        const evmEvent = findEvmEvent(events);

        if (!evmEvent) {
          return logger.throwError('findEvmEvent failed. blockNumber' + blockNumber + 'transactionIndex: '
            + transactionIndex, Logger.errors.UNSUPPORTED_OPERATION);
        }

        // logger.info(extrinsic.method.toHuman());
        // logger.info(extrinsic.method);

        let gas;
        let value;
        let input;
        const from = evmEvent.event.data[0].toString();
        const to = ['Created', 'CreatedFailed'].includes(evmEvent.event.method)
          ? null
          : evmEvent.event.data[1].toString();

        switch (extrinsic.method.section.toUpperCase()) {
          case 'EVM': {
            const evmExtrinsic: any = extrinsic.method.toJSON();
            value = evmExtrinsic?.args?.value;
            gas = evmExtrinsic?.args?.gas_limit;
            // @TODO remove
            // only work on mandala and karura-testnet
            // https://github.com/AcalaNetwork/Acala/pull/1965
            input = evmExtrinsic?.args?.input || evmExtrinsic?.args?.init;
            break;
          }
          case 'CURRENCIES': {
            // https://github.com/AcalaNetwork/Acala/blob/f94e9dd2212b4cb626ca9c8f698e444de2cb89fa/modules/evm-bridge/src/lib.rs#L174-L189
            const evmExtrinsic: any = extrinsic.method.toJSON();
            value = 0;
            gas = 2_100_000;
            const contract = evmExtrinsic?.args?.currency_id?.erc20;
            const erc20 = new ethers.Contract(contract, ERC20_ABI);
            const amount = evmExtrinsic?.args?.amount;
            input = (await erc20.populateTransaction.transfer(to, amount))?.data;
            break;
          }
          case 'SUDO': {
            const evmExtrinsic: any = extrinsic.method.toJSON();
            value = evmExtrinsic?.args?.call?.args?.value;
            gas = evmExtrinsic?.args?.call?.args?.gas_limit;
            input = evmExtrinsic?.args?.call?.args?.input || evmExtrinsic?.args?.call?.args?.init;
            // @TODO remove
            // only work on mandala and karura-testnet
            // https://github.com/AcalaNetwork/Acala/pull/1971
            if (input === "0x") {
              // return token contracts
              input = MIRRORED_TOKEN_CONTRACT
            }
            break;
          }
          // @TODO support proxy
          case 'PROXY': {
            return logger.throwError('Unspport proxy', Logger.errors.UNSUPPORTED_OPERATION);
          }
          // @TODO support utility
          case 'UTILITY': {
            return logger.throwError('Unspport utility', Logger.errors.UNSUPPORTED_OPERATION);
          }
          default: {
            return logger.throwError('Unspport ' + extrinsic.method.section.toUpperCase(), Logger.errors.UNSUPPORTED_OPERATION);
          }
        };


        // @TODO eip2930, eip1559

        // @TODO Missing data
        return {
          gasPrice: '0x1', // TODO: get correct value
          gas,
          input,
          v: DUMMY_V,
          r: DUMMY_R,
          s: DUMMY_S,
          blockHash,
          blockNumber,
          transactionIndex,
          hash: extrinsic.hash.toHex(),
          nonce: extrinsic.nonce.toNumber(),
          from: from,
          to: to,
          value: hexValue(value),
        };
      }));
    }

    const data = {
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
      gasUsed: BIGNUMBER_ZERO,

      miner: author,
      extraData: EMPTY_STRING,
      sha3Uncles: EMTPY_UNCLE_HASH,
      receiptsRoot: headerExtended.extrinsicsRoot.toHex(), // TODO: ???
      logsBloom: DUMMY_LOGS_BLOOM, // TODO: ???
      size: block.size,
      uncles: EMTPY_UNCLES,

      transactions

      // with this field Metamask will send token with EIP-1559 format
      // but we want it to send with legacy format
      // baseFeePerGas: BIGNUMBER_ZERO,
    };

    // @TODO remove ts-ignore
    // @ts-ignore
    return data;
  };

  // @TODO free
  getBalance = async (
    addressOrName: string | Promise<string>,
    _blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<BigNumber> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(_blockTag);

    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockHash(blockTag)
    });

    const substrateAddress = await this.getSubstrateAddress(address, blockHash);

    const apiAt = await this.api.at(blockHash);

    const accountInfo = await apiAt.query.system.account(substrateAddress);

    return convertNativeToken(BigNumber.from(accountInfo.data.free.toBigInt()), this.chainDecimal);
  };

  getTransactionCount = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<number> => {
    return this.getEvmTransactionCount(addressOrName, blockTag);
  };

  getEvmTransactionCount = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<number> => {
    await this.getNetwork();

    const accountInfo = await this.queryAccountInfo(addressOrName, blockTag);

    return !accountInfo.isNone ? accountInfo.unwrap().nonce.toNumber() : 0;
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

    const apiAt = await this.api.at(blockHash);
    const accountInfo = await apiAt.query.system.account(substrateAddress);

    return accountInfo.nonce.toNumber();
  };

  getCode = async (
    addressOrName: string | Promise<string>,
    _blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(_blockTag);

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
    _blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(_blockTag);

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
    _blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    await this.getNetwork();
    const blockTag = await this._ensureSafeModeBlockTagFinalization(_blockTag);

    // @TODO resolvedPosition
    const { address, blockHash, resolvedPosition } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockHash(blockTag),
      resolvedPosition: Promise.resolve(position).then((p) => hexValue(p))
    });

    const apiAt = await this.api.at(blockHash);

    const code = await apiAt.query.evm.accountStorages(address, position);

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
        data,
        value?.toBigInt(),
        U64MAX.toBigInt(), // gas_limit u64::max
        U32MAX.toBigInt(), // storage_limit u32::max
        accessList
      )
      : this.api.tx.evm.call(
        to,
        data,
        value?.toBigInt(),
        U64MAX.toBigInt(), // gas_limit u64::max
        U32MAX.toBigInt(), // storage_limit u32::max
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

    const apiAt = await this.api.at(blockHash);

    const substrateAccount = await apiAt.query.evmAccounts.accounts<Option<AccountId>>(address);

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
    _blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<Option<EvmAccountInfo>> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(_blockTag);

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

    const apiAt = await this.api.at(blockHash);

    const accountInfo = await apiAt.query.evm.accounts<Option<EvmAccountInfo>>(address);

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
          'calculating substrate gas failed: invalid ETH gasLimit/gasPrice combination provided',
          Logger.errors.INVALID_ARGUMENT,
          _getErrInfo()
        );
      }

      if (gasLimit < 0n || validUntil < 0n || storageLimit < 0n) {
        logger.throwError(
          'substrate gasLimit, gasPrice, storageLimit should all be greater than 0',
          Logger.errors.INVALID_ARGUMENT,
          {
            ..._getErrInfo(),
            gasLimit,
            validUntil,
            storageLimit
          }
        );
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
      // @TODO Support create
      to: ethTx.to,
      gasLimit: gasLimit,
      storageLimit: storageLimit,
      value: ethTx.value.toString(),
      data: ethTx.data,
      accessList: ethTx.accessList
    };

    await (this.api.rpc as any).evm.call(callRequest);

    const extrinsic = this.api.tx.evm.ethCall(
      ethTx.to ? { Call: ethTx.to } : { Create: null },
      ethTx.data,
      ethTx.value.toString(),
      gasLimit,
      storageLimit,
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

    logger.debug(
      {
        evmAddr: ethTx.from,
        address: subAddr,
        hash: extrinsic.hash.toHex()
      },
      'sending raw transaction'
    );

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
    } catch (error) {
      (<any>error).transaction = tx;
      (<any>error).transactionHash = tx.hash;
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

    const apiAt = await this.api.at(result.blockHash);
    result.timestamp = Math.floor((await apiAt.query.timestamp.now()).toNumber() / 1000);

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

        const alreadyDone = function () {
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

            if ((confirms as number) <= blockNumber - startBlock) {
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
        return this.safeMode
          ? this.latestFinalizedBlockHash!
          : (await this.api.rpc.chain.getBlockHash()).toHex();
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

          const _blockHash = await this.api.rpc.chain.getBlockHash(blockNumber.toBigInt());

          if (_blockHash.isEmpty) {
            //@ts-ignore
            return logger.throwError('header not found', PROVIDER_ERRORS.HEADER_NOT_FOUND);
          }

          blockHash = _blockHash.toHex();
        }

        if (!blockHash) {
          return logger.throwArgumentError('blocktag should be a hex string or number', 'blockTag', blockTag);
        }

        return blockHash;
      }
    }
  };

  _isBlockFinalized = async (blockTag: BlockTag): Promise<boolean> => {
    const [finalizedHead, verifyingBlockHash] = await Promise.all([
      this.api.rpc.chain.getFinalizedHead(),
      this._getBlockHash(blockTag)
    ]);

    const [finalizedBlockNumber, verifyingBlockNumber] = (
      await Promise.all([
        this.api.rpc.chain.getHeader(finalizedHead),
        this.api.rpc.chain.getHeader(verifyingBlockHash),
      ])
    ).map((header) => header.number.toNumber());

    const canonicalHash = await this.api.rpc.chain.getBlockHash(verifyingBlockNumber);

    return (
      finalizedBlockNumber >= verifyingBlockNumber &&
      canonicalHash.toString() === verifyingBlockHash
    );
  };

  _ensureSafeModeBlockTagFinalization = async (_blockTag: BlockTagish): Promise<BlockTagish> => {
    if (!this.safeMode || !_blockTag) return _blockTag;

    const blockTag = await _blockTag;
    if (blockTag === 'latest') return this.latestFinalizedBlockHash;

    const isBlockFinalized = await this._isBlockFinalized(blockTag);

    return isBlockFinalized
      ? blockTag
      // We can also throw header not found error here, which is more consistent with actual block not found error. However, This error is more informative.
      : logger.throwError(
        'SAFE MODE ERROR: target block is not finalized',
        Logger.errors.UNKNOWN_ERROR,
        { blockTag }
      );
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
    const extrinsics = (await this._getExtrinsicsAtBlock(blockHash)) as GenericExtrinsic[];
    return extrinsics.map((e) => e.hash.toHex());
  };

  _getExtrinsicsAtBlock = async (
    blockHash: string,
    txHash?: string
  ): Promise<GenericExtrinsic | GenericExtrinsic[] | undefined> => {
    const block = await this.api.rpc.chain.getBlock(blockHash.toLowerCase());
    const { extrinsics } = block.block;

    if (!txHash) return extrinsics;

    const _txHash = txHash.toLowerCase();
    return extrinsics.find((e) => e.hash.toHex() === _txHash);
  };

  // @TODO Testing
  getTransactionReceiptAtBlock = async (
    hashOrNumber: number | string | Promise<string>,
    _blockTag: BlockTag | Promise<BlockTag>
  ): Promise<TransactionReceipt> => {
    const blockTag = await this._ensureSafeModeBlockTagFinalization(_blockTag);

    hashOrNumber = await hashOrNumber;
    const header = await this._getBlockHeader(blockTag);
    const blockHash = header.hash.toHex();
    const blockNumber = header.number.toNumber();

    const apiAt = await this.api.at(blockHash);

    const [block, blockEvents] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      apiAt.query.system.events()
    ]);

    const { transactionHash, transactionIndex, extrinsicIndex, isExtrinsicFailed } = getTransactionIndexAndHash(
      hashOrNumber,
      block.block.extrinsics,
      blockEvents
    );

    const extrinsicEvents = blockEvents.filter(
      (event) => event.phase.isApplyExtrinsic && event.phase.asApplyExtrinsic.toNumber() === extrinsicIndex
    );

    if (isExtrinsicFailed) {
      const [dispatchError] = extrinsicEvents[extrinsicEvents.length - 1].event.data as any[];

      let message = dispatchError.type;

      if (dispatchError.isModule) {
        try {
          const mod = dispatchError.asModule;
          const error = this.api.registry.findMetaError(new Uint8Array([mod.index.toNumber(), mod.error.toNumber()]));
          message = `${error.section}.${error.name}`;
        } catch (error) {
          // swallow
        }
      }

      return logger.throwError(`ExtrinsicFailed: ${message}`, Logger.errors.UNKNOWN_ERROR, {
        hash: transactionHash,
        blockHash
      });
    }

    // @TODO
    const evmEvent = findEvmEvent(extrinsicEvents);

    if (!evmEvent) {
      return logger.throwError(`evm event not found`, Logger.errors.UNKNOWN_ERROR, {
        hash: transactionHash,
        blockHash
      });
    }

    const transactionInfo = { transactionIndex, blockHash, transactionHash, blockNumber };

    const partialTransactionReceipt = getPartialTransactionReceipt(evmEvent);

    // to and contractAddress may be undefined
    return this.formatter.receipt({
      confirmations: (await this._getBlockHeader('latest')).number.toNumber() - blockNumber,
      ...transactionInfo,
      ...partialTransactionReceipt,
      logs: partialTransactionReceipt.logs.map((log) => ({
        ...transactionInfo,
        ...log
      }))
    }) as any;
  };

  static isProvider(value: any): value is Provider {
    return !!(value && value._isProvider);
  }

  _getTxReceiptFromCache = async (txHash: string): Promise<TransactionReceipt | null> => {
    const targetBlockNumber = this._cache?.getBlockNumber(txHash);
    if (!targetBlockNumber) return null;

    const targetBlockHash = await this.api.rpc.chain.getBlockHash(targetBlockNumber);

    return this.getTransactionReceiptAtBlock(txHash, targetBlockHash.toHex());
  };

  _isTXPending = async (txHash: string): Promise<boolean> => {
    const pendingExtrinsics = await this.api.rpc.author.pendingExtrinsics();
    for (const e of pendingExtrinsics) {
      if (e.hash.toHex() === txHash) return true;
    }

    return false;
  };

  _getTXReceiptFromNextBlock = async (txHash: string, timeout = 20000): Promise<TransactionReceipt | null> => {
    return await Promise.race([
      sleep(timeout),
      new Promise<TransactionReceipt | null>((resolve) => {
        const receiptWaiter = async (nextHeader: Header): Promise<void> => {
          const nextBlockHash = nextHeader.hash.toHex() as string;
          try {
            const res = await this.getTransactionReceiptAtBlock(txHash, nextBlockHash);
            resolve(res);
          } catch (error) {
            // `getTransactionReceiptAtBlock` throwing error means tx not found in next block
            resolve(null);
          }
        };

        this._newBlockListeners.push(receiptWaiter);
      }),
    ]);
  };

  _getTXReceipt = async (txHash: string): Promise<TransactionReceipt | TransactionReceiptGQL> => {
    if (await this._isTXPending(txHash)) {
      const txFromNextBlock = await this._getTXReceiptFromNextBlock(txHash);
      if (txFromNextBlock) return txFromNextBlock;
    }

    const txFromCache = await this._getTxReceiptFromCache(txHash);
    if (txFromCache) return txFromCache;

    try {
      const txFromSubql = await this.subql?.getTxReceiptByHash(txHash);
      return txFromSubql || logger.throwError(`transaction hash not found`, Logger.errors.UNKNOWN_ERROR, { txHash });
    } catch {
      return logger.throwError(`transaction hash not found`, Logger.errors.UNKNOWN_ERROR, { txHash });
    }
  };

  // Queries
  getTransaction = (txHash: string): Promise<TransactionResponse> =>
    throwNotImplemented('getTransaction (deprecated: please use getTransactionByHash)');

  getTransactionByHash = async (txHash: string): Promise<TX> => {
    const tx = await this._getTXReceipt(txHash);

    const extrinsic = await this._getExtrinsicsAtBlock(tx.blockHash, txHash);

    if (!extrinsic) {
      return logger.throwError(`extrinsic not found from hash`, Logger.errors.UNKNOWN_ERROR, { txHash });
    }

    const nonce = (extrinsic as GenericExtrinsic).nonce.toNumber();
    const { args } = (extrinsic as GenericExtrinsic).method.toJSON();
    const input = (args as any).input ?? '';
    const value = (args as any).value ?? 0;

    return {
      from: tx.from,
      to: tx.to || null,
      hash: tx.transactionHash,
      blockHash: tx.blockHash,
      nonce,
      blockNumber: tx.blockNumber,
      transactionIndex: tx.transactionIndex,
      value,
      gasPrice: GAS_PRICE,
      gas: tx.gasUsed,
      input
    };
  };

  getTransactionReceipt = async (txHash: string): Promise<TransactionReceipt> => {
    // @TODO
    // @ts-ignore
    return this.getTXReceiptByHash(txHash);
  };

  getTXReceiptByHash = async (txHash: string): Promise<TXReceipt> => {
    const tx = await this._getTXReceipt(txHash);

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
      effectiveGasPrice: EFFECTIVE_GAS_PRICE,
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
  getLogs = async (filter: Filter): Promise<Log[]> => {
    if (!this.subql) {
      return logger.throwError('missing subql url to fetch logs, to initialize base provider with subql, please provide a subqlUrl param.');
    }

    const { fromBlock = 'latest', toBlock = 'latest' } = filter;
    const _filter = { ...filter };

    if (fromBlock) {
      const fromBlockNumber = await this._getBlockNumberFromTag(fromBlock);
      _filter.fromBlock = fromBlockNumber;
    }
    if (toBlock) {
      const toBlockNumber = await this._getBlockNumberFromTag(toBlock);
      _filter.toBlock = toBlockNumber;
    }

    const filteredLogs = await this.subql.getFilteredLogs(_filter as Filter);

    return filteredLogs.map((log) => this.formatter.filterLog(log));
  };

  getIndexerMetadata = async (): Promise<any> => {
    return this.subql?.getIndexerMetadata();
  };

  getUnfinalizedCachInfo = (): any => this._cache?._inspect() || 'no cache running!';

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
