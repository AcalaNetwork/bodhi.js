import type { EvmAccountInfo, EvmContractInfo } from '@acala-network/types/interfaces';
import {
  EventType,
  Filter,
  Listener,
  Log,
  Provider as AbstractProvider,
  Provider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse
} from '@ethersproject/abstract-provider';
import { hexlify, hexValue, isHexString, joinSignature } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { Network } from '@ethersproject/networks';
import { Deferrable, defineReadOnly, resolveProperties } from '@ethersproject/properties';
import { accessListify, parse, Transaction } from '@ethersproject/transactions';
import { ApiPromise } from '@polkadot/api';
import { createHeaderExtended } from '@polkadot/api-derive';
import type { Option } from '@polkadot/types';
import type { AccountId } from '@polkadot/types/interfaces';
import { BigNumber, BigNumberish } from 'ethers';
import { BIGNUMBER_ZERO, EMPTY_STRING, ZERO } from './consts';
import { logger, throwNotImplemented, convertNativeToken, evmAddressToSubstrateAddress } from './utils';

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

  _network: Network | null = null;

  setApi = (api: ApiPromise) => {
    defineReadOnly(this, '_api', api);
  };

  get api(): ApiPromise {
    if (!this._api) {
      return logger.throwError('the api needs to be set', Logger.errors.UNKNOWN_ERROR);
    }

    return this._api;
  }

  get genesisHash() {
    return this.api.genesisHash.toHex();
  }

  get isConnected() {
    return this.api.isConnected;
  }

  get chainDecimal() {
    return this.api.registry.chainDecimals[0] || 10;
  }

  isReady = async (): Promise<Network> => {
    if (this._network === null) {
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

  disconnect = async () => {
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

    const [block, header, validators, now] = await Promise.all([
      this.api.rpc.chain.getBlock(blockHash),
      this.api.rpc.chain.getHeader(blockHash),
      this.api.query.session ? this.api.query.session.validators.at(blockHash) : ([] as any),
      this.api.query.timestamp.now.at(blockHash)
      // this.api.query.system.events.at(blockHash),
    ]);

    const headerExtended = createHeaderExtended(header.registry, header, validators);

    const deafultNonce = this.api.registry.createType('u64', 0);
    const deafultMixHash = this.api.registry.createType('u256', 0);

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

      miner: headerExtended.author?.toString() || EMPTY_STRING, // @TODO Converted to ETH address
      author: headerExtended.author?.toString() || EMPTY_STRING, // @TODO Converted to ETH address
      extraData: EMPTY_STRING,

      baseFeePerGas: BIGNUMBER_ZERO,
      transactions: block.block.extrinsics.map((e) => e.hash.toHex()) // When the full parameter is true, it should return TransactionReceipt
    };
  };

  getBlockWithTransactions(blockTag: BlockTag | string | Promise<BlockTag | string>): Promise<BlockWithTransactions> {
    // @TODO implementing full
    return this.getBlock(blockTag, true) as any;
  }

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

    const substrateAddress = await this.querySubstrateAddress(address, blockHash);

    if (!substrateAddress) return BIGNUMBER_ZERO;

    const accountInfo = await this.api.query.system.account.at(blockHash, substrateAddress);

    return convertNativeToken(BigNumber.from(accountInfo.data.free.toBigInt()), this.chainDecimal);
  };

  getTransactionCount = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<number> => {
    await this.getNetwork();

    const resolvedBlockTag = await blockTag;

    if (resolvedBlockTag === 'pending') {
      const idx = await this.api.rpc.system.accountNextIndex(evmAddressToSubstrateAddress(await addressOrName));
      return idx.toNumber();
    }

    const accountInfo = await this.queryAccountInfo(addressOrName, resolvedBlockTag);

    return !accountInfo.isNone ? accountInfo.unwrap().nonce.toNumber() : 0;
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

    const code = blockHash
      ? await this.api.query.evm.codes.at(blockHash, codeHash)
      : await this.api.query.evm.codes(codeHash);

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

  async getStorageAt(
    addressOrName: string | Promise<string>,
    position: BigNumberish | Promise<BigNumberish>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> {
    await this.getNetwork();

    const { address, resolvedPosition, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag),
      resolvedPosition: Promise.resolve(position).then((p) => hexValue(p))
    });

    const code = await this.api.query.evm.accountStorages.at(blockHash, address, position);

    return code.toHex();
  }

  querySubstrateAddress = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string | null> => {
    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag)
    });

    const substrateAccount = await this.api.query.evmAccounts.accounts.at<Option<AccountId>>(blockHash, address);

    return substrateAccount.isEmpty ? null : substrateAccount.toString();
  };

  queryAccountInfo = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<Option<EvmAccountInfo>> => {
    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag)
    });

    const accountInfo = this.api.query.evm.accounts.at<Option<EvmAccountInfo>>(blockHash, address);

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

    const subAddr = evmAddressToSubstrateAddress(ethTx.from);

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

  _getAddress = async (addressOrName: string | Promise<string>): Promise<string> => {
    addressOrName = await addressOrName;
    return addressOrName;
  };

  _getTransactionRequest = async (transaction: Deferrable<TransactionRequest>): Promise<Transaction> => {
    const values: any = await transaction;

    const tx: any = {};

    ['from', 'to'].forEach((key) => {
      if (values[key] == null) {
        return;
      }
      tx[key] = Promise.resolve(values[key]).then((v) => (v ? this._getAddress(v) : null));
    });

    ['gasLimit', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'value'].forEach((key) => {
      if (values[key] == null) {
        return;
      }
      tx[key] = Promise.resolve(values[key]).then((v) => (v ? BigNumber.from(v) : null));
    });

    ['type'].forEach((key) => {
      if (values[key] == null) {
        return;
      }
      tx[key] = Promise.resolve(values[key]).then((v) => (v != null ? v : null));
    });

    if (values.accessList) {
      tx.accessList = accessListify(values.accessList);
    }

    ['data'].forEach((key) => {
      if (values[key] == null) {
        return;
      }
      tx[key] = Promise.resolve(values[key]).then((v) => (v ? hexlify(v) : null));
    });

    return await resolveProperties(tx);
  };

  static isProvider(value: any): value is Provider {
    return !!(value && value._isProvider);
  }

  abstract sendTransaction(signedTransaction: string | Promise<string>): Promise<TransactionResponse>;

  /**
   * TODO
   */

  // Latest State
  getGasPrice = (): Promise<BigNumber> => throwNotImplemented('getGasPrice');

  // Queries
  getTransaction = (transactionHash: string): Promise<TransactionResponse> => throwNotImplemented('getTransaction');
  getTransactionReceipt = (transactionHash: string): Promise<TransactionReceipt> =>
    throwNotImplemented('getTransactionReceipt');

  // Bloom-filter Queries
  getLogs = (filter: Filter): Promise<Array<Log>> => throwNotImplemented('getLogs');

  // ENS
  resolveName = (name: string | Promise<string>): Promise<string> => throwNotImplemented('resolveName');
  lookupAddress = (address: string | Promise<string>): Promise<string> => throwNotImplemented('lookupAddress');

  // Execution
  estimateGas = (transaction: Deferrable<TransactionRequest>): Promise<BigNumber> => throwNotImplemented('estimateGas');

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
