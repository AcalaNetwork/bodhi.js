import { options } from '@acala-network/api';
import type { EvmAccountInfo, EvmContractInfo } from '@acala-network/types/interfaces';
import { Block, TransactionRequest } from '@ethersproject/abstract-provider';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { hexlify, hexValue, isHexString, joinSignature } from '@ethersproject/bytes';
import { Deferrable, resolveProperties } from '@ethersproject/properties';
import { accessListify, parse, Transaction } from '@ethersproject/transactions';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { createHeaderExtended } from '@polkadot/api-derive';
import type { Option } from '@polkadot/types';
import type { AccountId } from '@polkadot/types/interfaces';
import { InvalidParams, UnsupportedParams } from './errors';
import { logger } from './logger';
import { convertNativeToken, evmAddressToSubstrateAddress } from './utils';

export type BlockTag = 'earliest' | 'latest' | 'pending' | string | number;

const ZERO = 0;
const EMPTY_STRING = '';
const BIGNUMBER_ZERO = BigNumber.from(ZERO);

interface RichBlock extends Block {
  stateRoot: string;
  transactionsRoot: string;
  author: string;
  mixHash: string;
}

export class EvmRpcProvider {
  readonly #api: ApiPromise;

  constructor(endpoint?: string | string[]) {
    this.#api = new ApiPromise(
      options({
        types: {
          AtLeast64BitUnsigned: 'u128',
          EvmAccountInfo: {
            nonce: 'Index',
            contractInfo: 'Option<EvmContractInfo>',
            developerDeposit: 'Option<Balance>',
          },
          EvmContractInfo: {
            codeHash: 'H256',
            maintainer: 'H160',
            deployed: 'bool',
          },
          TransactionAction: {
            _enum: {
              Call: 'H160',
              Create: 'Null',
            },
          },
          MultiSignature: {
            _enum: {
              Ed25519: 'Ed25519Signature',
              Sr25519: 'Sr25519Signature',
              Ecdsa: 'EcdsaSignature',
              Ethereum: '[u8; 65]',
              Eip712: '[u8; 65]',
            },
          },
        },
        provider: new WsProvider(endpoint),
      })
    );
  }

  get genesisHash() {
    return this.#api.genesisHash.toHex();
  }

  get isConnected() {
    return this.#api.isConnected;
  }

  get chainDecimal() {
    return this.#api.registry.chainDecimals[0] || 10;
  }

  isReady = async () => {
    try {
      await this.#api.isReadyOrError;
    } catch (e) {
      await this.#api.disconnect();
      throw e;
    }
  };

  disconnect = async () => {
    await this.#api.disconnect();
  };

  netVersion = async (): Promise<string> => {
    return this.#api.consts.evm.chainId.toString();
  };

  chainId = async (): Promise<number> => {
    return (this.#api.consts.evm.chainId as any).toNumber();
  };

  getBlockNumber = async (): Promise<number> => {
    const blockHash = await this._getBlockTag('latest');
    const header = await this.#api.rpc.chain.getHeader(blockHash);
    return header.number.toNumber();
  };

  getBlock = async (
    blockTag: BlockTag | string | Promise<BlockTag | string>,
    full?: boolean | Promise<boolean>
  ): Promise<RichBlock> => {
    // @TODO
    if (full) {
      throw new UnsupportedParams('Param not available', `The param "full" is not available.`);
    }

    const { fullTx, blockHash } = await resolveProperties({
      blockHash: this._getBlockTag(blockTag),
      fullTx: full,
    });

    const [block, header, validators, now] = await Promise.all([
      this.#api.rpc.chain.getBlock(blockHash),
      this.#api.rpc.chain.getHeader(blockHash),
      this.#api.query.session ? this.#api.query.session.validators.at(blockHash) : ([] as any),
      this.#api.query.timestamp.now.at(blockHash),
      // this.#api.query.system.events.at(blockHash),
    ]);

    const headerExtended = createHeaderExtended(header.registry, header, validators);

    const deafultNonce = this.#api.registry.createType('u64', 0);
    const deafultMixHash = this.#api.registry.createType('u256', 0);

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
      transactions: block.block.extrinsics.map((e) => e.hash.toHex()), // When the full parameter is true, it should return TransactionReceipt
    };
  };

  // @TODO free
  getBalance = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<BigNumber> => {
    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag),
    });

    const substrateAddress = await this.querySubstrateAddress(address, blockHash);

    if (!substrateAddress) return BIGNUMBER_ZERO;

    const accountInfo = await this.#api.query.system.account.at(blockHash, substrateAddress);

    return convertNativeToken(BigNumber.from(accountInfo.data.free.toBigInt()), this.chainDecimal);
  };

  getTransactionCount = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<number> => {
    const resolvedBlockTag = await blockTag;

    if (resolvedBlockTag === 'pending') {
      const idx = await this.#api.rpc.system.accountNextIndex(evmAddressToSubstrateAddress(await addressOrName));
      return idx.toNumber();
    }

    const accountInfo = await this.queryAccountInfo(addressOrName, resolvedBlockTag);

    return !accountInfo.isNone ? accountInfo.unwrap().nonce.toNumber() : 0;
  };

  getCode = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag),
    });

    const contractInfo = await this.queryContractInfo(address, blockHash);

    if (contractInfo.isNone) {
      return '0x';
    }

    const codeHash = contractInfo.unwrap().codeHash;

    const code = blockHash
      ? await this.#api.query.evm.codes.at(blockHash, codeHash)
      : await this.#api.query.evm.codes(codeHash);

    return code.toHex();
  };

  call = async (
    transaction: Deferrable<TransactionRequest>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> => {
    const resolved = await resolveProperties({
      transaction: this._getTransactionRequest(transaction),
      blockHash: this._getBlockTag(blockTag),
    });

    if (!resolved.transaction.from) {
      return '0x';
    }

    const callRequest = {
      from: resolved.transaction.from,
      to: resolved.transaction.to,
      gasLimit: resolved.transaction.gasLimit?.toBigInt(),
      storage_limit: undefined,
      value: resolved.transaction.value?.toBigInt(),
      data: resolved.transaction.data,
    };

    const data = resolved.blockHash
      ? await (this.#api.rpc as any).evm.call(callRequest, resolved.blockHash)
      : await (this.#api.rpc as any).evm.call(callRequest);

    return data.toHex();
  };

  async getStorageAt(
    addressOrName: string | Promise<string>,
    position: BigNumberish | Promise<BigNumberish>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string> {
    // await this.getNetwork();
    const { address, resolvedPosition, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag),
      resolvedPosition: Promise.resolve(position).then((p) => hexValue(p)),
    });

    const code = await this.#api.query.evm.accountStorages.at(blockHash, address, position);

    return code.toHex();
  }

  querySubstrateAddress = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<string | null> => {
    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag),
    });

    const substrateAccount = await this.#api.query.evmAccounts.accounts.at<Option<AccountId>>(blockHash, address);

    return substrateAccount.isEmpty ? null : substrateAccount.toString();
  };

  queryAccountInfo = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<Option<EvmAccountInfo>> => {
    const { address, blockHash } = await resolveProperties({
      address: this._getAddress(addressOrName),
      blockHash: this._getBlockTag(blockTag),
    });

    const accountInfo = this.#api.query.evm.accounts.at<Option<EvmAccountInfo>>(blockHash, address);

    return accountInfo;
  };

  queryContractInfo = async (
    addressOrName: string | Promise<string>,
    blockTag?: BlockTag | Promise<BlockTag>
  ): Promise<Option<EvmContractInfo>> => {
    const accountInfo = await this.queryAccountInfo(addressOrName, blockTag);

    if (accountInfo.isNone) {
      return this.#api.createType<Option<EvmContractInfo>>('Option<EvmContractInfo>', null);
    }

    return accountInfo.unwrap().contractInfo;
  };

  sendRawTransaction = async (rawTx: string): Promise<string> => {
    const ethTx = parse(rawTx);

    if (!ethTx.from) {
      throw new Error('Invalid tranasction');
    }

    const storageLimit = ethTx.gasPrice?.shr(32).toString() ?? 0;
    const validUntil = ethTx.gasPrice?.and(0xffffffff).toString() ?? 0;

    const acalaTx = this.#api.tx.evm.ethCall(
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
      transactionVersion: 0, // ignored
    });

    logger.debug(
      {
        evmAddr: ethTx.from,
        address: subAddr,
        hash: acalaTx.hash.toHex(),
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
        throw new UnsupportedParams('Not support pending tag');
      }
      case 'latest': {
        const hash = await this.#api.rpc.chain.getBlockHash();
        return hash.toHex();
      }
      case 'earliest': {
        const hash = this.#api.genesisHash;
        return hash.toHex();
      }
      default: {
        if (!isHexString(blockTag)) {
          throw new InvalidParams('blocktag should be a hex string');
        }

        // block hash
        if (typeof blockTag === 'string' && isHexString(blockTag, 32)) {
          return blockTag;
        }

        const blockNumber = BigNumber.from(blockTag).toNumber();

        const hash = await this.#api.rpc.chain.getBlockHash(blockNumber);

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
}
