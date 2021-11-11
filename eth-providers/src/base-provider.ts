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
import { getAddress } from '@ethersproject/address';
import { hexlify, hexValue, isHexString, joinSignature } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { Network } from '@ethersproject/networks';
import { Deferrable, defineReadOnly, resolveProperties } from '@ethersproject/properties';
import { accessListify, parse, Transaction } from '@ethersproject/transactions';
import { ApiPromise } from '@polkadot/api';
import { createHeaderExtended } from '@polkadot/api-derive';
import type { Option, Vec } from '@polkadot/types';
import type { AccountId, DispatchInfo, EvmLog } from '@polkadot/types/interfaces';
import type BN from 'bn.js';
import { BigNumber, BigNumberish } from 'ethers';
import {
  BIGNUMBER_ZERO,
  BIGNUMBER_ONE,
  EFFECTIVE_GAS_PRICE,
  EMPTY_STRING,
  GAS_PRICE,
  MAX_FEE_PER_GAS,
  MAX_PRIORITY_FEE_PER_GAS,
  U32MAX,
  U64MAX,
  ZERO
} from './consts';
import {
  computeDefaultSubstrateAddress,
  computeDefaultEvmAddress,
  convertNativeToken,
  logger,
  throwNotImplemented,
  getPartialTransactionReceipt,
  getTxReceiptByHash,
  getFilteredLogs
} from './utils';

export type BlockTag = 'earliest' | 'latest' | 'pending' | string | number;

// https://github.com/ethers-io/ethers.js/blob/master/packages/abstract-provider/src.ts/index.ts#L61
export interface _Block {
  hash: string;
  parentHash: string;
  number: number;

  timestamp: number;
  nonce: string;
  difficulty: number;

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
  author: string;
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
}

export abstract class BaseProvider extends AbstractProvider {
  readonly _api?: ApiPromise;

  _network?: Network;

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

  isReady = async (): Promise<Network> => {
    if (!this._network) {
      try {
        await this.api.isReadyOrError;

        const network = {
          name: this.api.runtimeVersion.specName.toString(),
          chainId: await this.chainId()
        };

        this._network = network;
      } catch (e) {
        await this.api.disconnect();
        throw e;
      }
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
    return (this.api.consts.evm.chainId as any).toNumber();
  };

  getBlockNumber = async (): Promise<number> => {
    await this.getNetwork();

    const blockHash = await this._getBlockTag('latest');
    const header = await this.api.rpc.chain.getHeader(blockHash);
    return header.number.toNumber();
  };

  getBlock = async (
    blockTag: BlockTag | string | Promise<BlockTag | string>,
    full?: boolean | Promise<boolean>
  ): Promise<RichBlock> => {
    await this.getNetwork();
    // @TODO
    if (full) {
      return logger.throwError('getBlock full param not implemented', Logger.errors.UNSUPPORTED_OPERATION);
    }

    const { fullTx, blockHash } = await resolveProperties({
      blockHash: this._getBlockTag(blockTag),
      fullTx: full
    });

    const apiAt = await this.api.at(blockHash);

    const [block, header, validators, now] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      this.api.rpc.chain.getHeader(blockHash),
      this.api.query.session ? apiAt.query.session.validators() : ([] as any),
      apiAt.query.timestamp.now()
      // apiAt.query.system.events(),
    ]);

    const headerExtended = createHeaderExtended(header.registry, header, validators);

    const deafultNonce = this.api.registry.createType('u64', 0);
    const deafultMixHash = this.api.registry.createType('u256', 0);

    const author = headerExtended.author ? await this.getEvmAddress(headerExtended.author.toString()) : EMPTY_STRING;

    return {
      hash: headerExtended.hash.toHex(),
      parentHash: headerExtended.parentHash.toHex(),
      number: headerExtended.number.toNumber(),
      stateRoot: headerExtended.stateRoot.toHex(),
      transactionsRoot: headerExtended.extrinsicsRoot.toHex(),
      timestamp: now.toNumber(),
      nonce: deafultNonce.toHex(),
      mixHash: deafultMixHash.toHex(),
      difficulty: ZERO,
      gasLimit: BIGNUMBER_ZERO,
      gasUsed: BIGNUMBER_ZERO,

      miner: author,
      author: author,
      extraData: EMPTY_STRING,

      baseFeePerGas: BIGNUMBER_ZERO,
      transactions: block.block.extrinsics.map((e) => e.hash.toHex()) // When the full parameter is true, it should return TransactionReceipt
    };
  };

  getBlockWithTransactions = async (
    blockTag: BlockTag | string | Promise<BlockTag | string>
  ): Promise<BlockWithTransactions> => {
    // @TODO implementing full
    return this.getBlock(blockTag, true) as any;
  };

  // @TODO free
  getBalance = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<BigNumber> => {
    await this.getNetwork();

    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag)
    });

    const substrateAddress = await this.getSubstrateAddress(address, blockHash);

    if (!substrateAddress) return BIGNUMBER_ZERO;

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

    const blockHash = await this._getBlockTag(blockTag);

    const apiAt = await this.api.at(blockHash);
    const accountInfo = await apiAt.query.system.account(substrateAddress);

    return accountInfo.nonce.toNumber();
  };

  getCode = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    await this.getNetwork();

    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag)
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
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    await this.getNetwork();

    const resolved = await resolveProperties({
      transaction: this._getTransactionRequest(transaction),
      blockHash: this._getBlockTag(blockTag)
    });

    if (!resolved.transaction.from) {
      return '0x';
    }

    const callRequest: CallRequest = {
      from: resolved.transaction.from,
      to: resolved.transaction.to,
      gasLimit: resolved.transaction.gasLimit?.toBigInt(),
      storageLimit: undefined,
      value: resolved.transaction.value?.toBigInt(),
      data: resolved.transaction.data
    };

    const data = resolved.blockHash
      ? await (this.api.rpc as any).evm.call(callRequest, resolved.blockHash)
      : await (this.api.rpc as any).evm.call(callRequest);

    return data.toHex();
  };

  getStorageAt = async (
    addressOrName: string | Promise<string>,
    position: BigNumberish | Promise<BigNumberish>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    await this.getNetwork();

    // @TODO resolvedPosition
    const { address, blockHash, resolvedPosition } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag),
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
    return GAS_PRICE;
  };

  getFeeData = async (): Promise<FeeData> => {
    return {
      maxFeePerGas: MAX_FEE_PER_GAS,
      maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
      gasPrice: GAS_PRICE
    };
  };

  /**
   * Estimate gas for a transaction.
   * @param transaction The transaction to estimate the gas of
   * @returns The estimated gas used by this transaction
   */
  estimateGas = async (transaction: Deferrable<TransactionRequest>): Promise<BigNumber> => {
    const resources = await this.estimateResources(transaction);
    return resources.gas.add(resources.storage);
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

    if (!ethTx.from) {
      return logger.throwArgumentError('missing from address', 'transaction', ethTx);
    }

    const { from, to, data, value } = ethTx;

    const extrinsic = !to
      ? this.api.tx.evm.create(
          data,
          value?.toBigInt(),
          U64MAX.toBigInt(), // gas_limit u64::max
          U32MAX.toBigInt() // storage_limit u32::max
        )
      : this.api.tx.evm.call(
          to,
          data,
          value?.toBigInt(),
          U64MAX.toBigInt(), // gas_limit u64::max
          U32MAX.toBigInt() // storage_limit u32::max
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
      blockHash: this._getBlockTag(blockTag)
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
      blockHash: this._getBlockTag(blockTag)
    });

    const apiAt = await this.api.at(blockHash);

    const evmAddress = await apiAt.query.evmAccounts.evmAddresses(substrateAddress);

    return getAddress(evmAddress.isEmpty ? computeDefaultEvmAddress(substrateAddress) : evmAddress.toString());
  };

  queryAccountInfo = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<Option<EvmAccountInfo>> => {
    // pending tag
    const resolvedBlockTag = await blockTag;
    if (resolvedBlockTag === 'pending') {
      const address = await this._getAddress(addressOrName);
      return this.api.query.evm.accounts<Option<EvmAccountInfo>>(address);
    }

    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag)
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

  sendRawTransaction = async (rawTx: string): Promise<string> => {
    await this.getNetwork();

    const ethTx = parse(rawTx);

    if (!ethTx.from) {
      return logger.throwArgumentError('missing from address', 'transaction', ethTx);
    }

    const storageLimit = ethTx.gasPrice?.shr(32).toString() ?? 0;
    const validUntil = ethTx.gasPrice?.and(0xffffffff).toString() ?? 0;

    const acalaTx = this.api.tx.evm.ethCall(
      ethTx.to ? { Call: ethTx.to } : { Create: null },
      ethTx.data,
      ethTx.value.toString(),
      ethTx.gasLimit.toString(),
      storageLimit,
      validUntil
    );

    const subAddr = await this.getSubstrateAddress(ethTx.from);

    const sig = joinSignature({ r: ethTx.r!, s: ethTx.s, v: ethTx.v });

    acalaTx.addSignature(subAddr, { Ethereum: sig } as any, {
      blockHash: '0x', // ignored
      era: '0x00', // mortal
      genesisHash: '0x', // ignored
      method: 'Bytes', // don't know waht is this
      nonce: ethTx.nonce,
      specVersion: 0, // ignored
      tip: 0, // need to be zero
      transactionVersion: 0 // ignored
    });

    logger.debug(
      {
        evmAddr: ethTx.from,
        address: subAddr,
        hash: acalaTx.hash.toHex()
      },
      'sending raw transaction'
    );

    await acalaTx.send();

    return acalaTx.hash.toHex();
  };

  _getBlockTag = async (blockTag?: BlockTag | Promise<BlockTag>): Promise<string> => {
    blockTag = await blockTag;

    if (blockTag === undefined) {
      blockTag = 'latest';
    }

    switch (blockTag) {
      case 'pending': {
        return logger.throwError('pending tag not implemented', Logger.errors.UNSUPPORTED_OPERATION);
      }
      case 'latest': {
        const hash = await this.api.rpc.chain.getBlockHash();
        return hash.toHex();
      }
      case 'earliest': {
        const hash = this.api.genesisHash;
        return hash.toHex();
      }
      default: {
        if (!isHexString(blockTag)) {
          return logger.throwArgumentError('blocktag should be a hex string', 'blockTag', blockTag);
        }

        // block hash
        if (typeof blockTag === 'string' && isHexString(blockTag, 32)) {
          return blockTag;
        }

        const blockNumber = BigNumber.from(blockTag).toNumber();

        const hash = await this.api.rpc.chain.getBlockHash(blockNumber);

        return hash.toHex();
      }
    }
  };

  _getBlockNumber = async (blockTag: BlockTag): Promise<number> => {
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
        if (typeof blockTag !== 'number') {
          return logger.throwArgumentError("blocktag should be number | 'latest' | 'earliest'", 'blockTag', blockTag);
        }

        return blockTag;
      }
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

  // @TODO Testing
  getTransactionReceiptAtBlock = async (txHash: string, blockHash: string): Promise<TransactionReceipt> => {
    txHash = txHash.toLowerCase();
    blockHash = blockHash.toLowerCase();

    const apiAt = await this.api.at(blockHash);

    const [block, header, blockEvents] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      this.api.rpc.chain.getHeader(blockHash),
      apiAt.query.system.events()
    ]);

    const blockNumber = header.number.toNumber();

    const { extrinsic, extrinsicIndex } =
      block.block.extrinsics
        .map((extrinsic, index) => {
          return {
            extrinsic,
            extrinsicIndex: index
          };
        })
        .find(({ extrinsic }) => extrinsic.hash.toHex() === txHash) || {};

    if (!extrinsic || !extrinsicIndex) {
      return logger.throwError(`transaction hash not found`, Logger.errors.UNKNOWN_ERROR, {
        hash: txHash,
        blockHash
      });
    }

    const events = blockEvents.filter(
      (event) => event.phase.isApplyExtrinsic && event.phase.asApplyExtrinsic.toNumber() === extrinsicIndex
    );

    const evmEvent = events.find(({ event }) => {
      return (
        event.section.toUpperCase() === 'EVM' &&
        ['Created', 'CreatedFailed', 'Executed', 'ExecutedFailed'].includes(event.method)
      );
    });

    if (!evmEvent) {
      return logger.throwError(`evm event not found`, Logger.errors.UNKNOWN_ERROR, {
        hash: txHash,
        blockHash
      });
    }

    const transactionInfo = { transactionIndex: extrinsicIndex, blockHash, transactionHash: txHash, blockNumber };
    const partialTransactionReceipt = getPartialTransactionReceipt(evmEvent);

    // to and contractAddress may be undefined
    return {
      confirmations: 1,
      ...transactionInfo,
      ...partialTransactionReceipt,
      logs: partialTransactionReceipt.logs.map((log) => ({
        ...transactionInfo,
        ...log
      }))
    } as any;
  };

  static isProvider(value: any): value is Provider {
    return !!(value && value._isProvider);
  }

  abstract sendTransaction(signedTransaction: string | Promise<string>): Promise<TransactionResponse>;

  /**
   * TODO
   */

  // Queries
  getTransaction = (transactionHash: string): Promise<TransactionResponse> => throwNotImplemented('getTransaction');
  getTransactionReceipt = async (transactionHash: string): Promise<TransactionReceipt> => {
    const tx = await getTxReceiptByHash(transactionHash);

    if (!tx) {
      return logger.throwError(`transaction hash not found`, Logger.errors.UNKNOWN_ERROR, { transactionHash });
    }

    // TODO: correct values of these?
    const confirmations = 1;
    const byzantium = false;
    const defaultAddress = '0x';

    return {
      to: tx.to || defaultAddress,
      from: tx.from,
      contractAddress: tx.contractAddress || defaultAddress,
      transactionIndex: tx.transactionIndex,
      gasUsed: tx.gasUsed,
      logsBloom: tx.logsBloom,
      blockHash: tx.blockHash,
      transactionHash: tx.transactionHash,
      logs: tx.logs.nodes as Log[],
      blockNumber: tx.blockNumber,
      cumulativeGasUsed: tx.cumulativeGasUsed,
      type: tx.type,
      status: tx.status,
      effectiveGasPrice: EFFECTIVE_GAS_PRICE,
      confirmations,
      byzantium
    };
  };

  // Bloom-filter Queries
  getLogs = async (filter: Filter): Promise<Log[]> => {
    const { fromBlock, toBlock } = filter;
    const _filter = { ...filter };

    if (fromBlock) {
      const fromBlockNumber = await this._getBlockNumber(fromBlock);
      _filter.fromBlock = fromBlockNumber;
    }
    if (toBlock) {
      const toBlockNumber = await this._getBlockNumber(toBlock);
      _filter.toBlock = toBlockNumber;
    }

    const filteredLogs = await getFilteredLogs(_filter as Filter);

    return filteredLogs;
  };

  // ENS
  lookupAddress = (address: string | Promise<string>): Promise<string> => throwNotImplemented('lookupAddress');

  waitForTransaction = (
    transactionHash: string,
    confirmations?: number,
    timeout?: number
  ): Promise<TransactionReceipt> => throwNotImplemented('waitForTransaction');

  // Event Emitter (ish)
  on = (eventName: EventType, listener: Listener): Provider => throwNotImplemented('on');
  once = (eventName: EventType, listener: Listener): Provider => throwNotImplemented('once');
  emit = (eventName: EventType, ...args: Array<any>): boolean => throwNotImplemented('emit');
  listenerCount = (eventName?: EventType): number => throwNotImplemented('listenerCount');
  listeners = (eventName?: EventType): Array<Listener> => throwNotImplemented('listeners');
  off = (eventName: EventType, listener?: Listener): Provider => throwNotImplemented('off');
  removeAllListeners = (eventName?: EventType): Provider => throwNotImplemented('removeAllListeners');
}
