import {
  Signer as AbstractSigner,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner,
} from '@ethersproject/abstract-signer';
import { BigNumber } from '@ethersproject/bignumber';
import { BodhiProvider, handleTxResponse, toBN } from '@acala-network/eth-providers';
import { Bytes, concat, joinSignature } from '@ethersproject/bytes';
import { Deferrable } from '@ethersproject/properties';
import { KeyringPair } from '@polkadot/keyring/types';
import { Logger } from '@ethersproject/logger';
import { MultiSigner } from './MultiSigner';
import { Signer } from '@polkadot/api/types';
import { SubmittableResult } from '@polkadot/api';
import { SubstrateSigner } from './SubstrateSigner';
import { TransactionRequest, TransactionResponse } from '@ethersproject/abstract-provider';
import { blake2AsU8a, decodeAddress, isEthereumAddress } from '@polkadot/util-crypto';
import { dataToString } from './utils';
import { getAddress } from '@ethersproject/address';
import { toUtf8Bytes } from '@ethersproject/strings';
import { u8aConcat, u8aEq, u8aToHex } from '@polkadot/util';
import { version } from './_version';
import type { TransactionReceipt } from '@ethersproject/abstract-provider';

export const logger = new Logger(version);

export class BodhiSigner extends AbstractSigner implements TypedDataSigner {
  readonly provider: BodhiProvider;
  readonly substrateAddress: string;
  readonly signer: Signer;
  constructor(provider: BodhiProvider, substrateAddress: string, signer: Signer) {
    super();

    if (isEthereumAddress(substrateAddress)) {
      logger.throwArgumentError('expect substrate address, not evm address!', 'substrateAddress', substrateAddress);
    }

    try {
      decodeAddress(substrateAddress);
    } catch {
      logger.throwArgumentError('invalid substrateAddress', 'substrateAddress', substrateAddress);
    }
    this.provider = provider;
    this.substrateAddress = substrateAddress;
    this.signer = signer;

    if (!this.provider.api['_rx'].signer) {
      this.provider.api.setSigner(new MultiSigner({ [substrateAddress]: signer }));
    } else {
      const multiSigner = this.provider.api['_rx'].signer;
      if (MultiSigner.isMultiSigner(multiSigner)) {
        multiSigner.addSigner(substrateAddress, signer);
      } else {
        throw new Error('Current signer is not MultiSigner, cannot override signer.');
      }
    }
  }

  static fromPair(provider: BodhiProvider, pair: KeyringPair): BodhiSigner {
    return new BodhiSigner(provider, pair.address, new SubstrateSigner(provider.api.registry, pair));
  }

  connect(_provider: BodhiProvider): BodhiSigner {
    return logger.throwError('cannot alter JSON-RPC Signer connection', Logger.errors.UNSUPPORTED_OPERATION, {
      operation: 'connect',
    });
  }

  /**
   *
   * @param evmAddress The EVM address to check
   * @returns A promise that resolves to true if the EVM address is claimed
   * or false if the address is not claimed
   */
  async isClaimed(evmAddress?: string): Promise<boolean> {
    const rpcEvmAddress = await this.queryEvmAddress();

    if (!rpcEvmAddress) return false;
    if (!evmAddress) return true;
    if (rpcEvmAddress === evmAddress) {
      return true;
    }

    return logger.throwError('An evm account already exists to bind to this account');
  }

  /**
   * Get the signer's EVM address, and claim an EVM address if it has not claimed one.
   * @returns A promise resolving to the EVM address of the signer's substrate
   * address
   */
  async getAddress(): Promise<string> {
    const address = await this.queryEvmAddress();
    if (address) {
      return address;
    } else {
      // default address
      return this.computeDefaultEvmAddress();
    }
  }

  /**
   * Get the signers EVM address if it has claimed one.
   * @returns A promise resolving to the EVM address of the signer's substrate
   * address or an empty string if the EVM address isn't claimed
   */
  async queryEvmAddress(): Promise<string> {
    const address = await this.provider.api.query.evmAccounts.evmAddresses(this.substrateAddress);

    return address.isEmpty ? '' : getAddress(address.toString());
  }

  /**
   *
   * @returns The default EVM address generated for the signer's substrate address
   */
  computeDefaultEvmAddress(): string {
    const publicKey = decodeAddress(this.substrateAddress);

    const isStartWithEvm = u8aEq('evm:', publicKey.slice(0, 4));

    if (isStartWithEvm) {
      return getAddress(u8aToHex(publicKey.slice(4, 24)));
    }

    return getAddress(u8aToHex(blake2AsU8a(u8aConcat('evm:', publicKey), 256).slice(0, 20)));
  }

  async claimEvmAccount(evmAddress: string): Promise<void> {
    const isConnented = await this.isClaimed(evmAddress);

    if (isConnented) return;

    const publicKey = decodeAddress(this.substrateAddress);
    const data = 'acala evm:' + Buffer.from(publicKey).toString('hex');
    const signature = await this._signMessage(evmAddress, data);
    const extrinsic = this.provider.api.tx.evmAccounts.claimAccount(evmAddress, signature);

    await extrinsic.signAsync(this.substrateAddress);

    await new Promise<void>((resolve, reject) => {
      extrinsic
        .send((result: SubmittableResult) => {
          handleTxResponse(result, this.provider.api)
            .then(() => {
              resolve();
            })
            .catch(err => {
              if (err.message === 'evmAccounts.AccountIdHasMapped') {
                resolve();
              }
              reject(err);
            });
        })
        .catch(reject);
    });
  }

  /**
   * Claims a default EVM address for this signer's substrate address
   */
  async claimDefaultAccount(): Promise<void> {
    const extrinsic = this.provider.api.tx.evmAccounts.claimDefaultAccount();

    await extrinsic.signAsync(this.substrateAddress);

    await new Promise<void>((resolve, reject) => {
      extrinsic
        .send((result: SubmittableResult) => {
          handleTxResponse(result, this.provider.api)
            .then(() => {
              resolve();
            })
            .catch(err => {
              if (err.message === 'evmAccounts.AccountIdHasMapped') {
                resolve();
              }
              reject(err);
            });
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  signTransaction(_transaction: Deferrable<TransactionRequest>): Promise<string> {
    return logger.throwError('signing transactions is unsupported', Logger.errors.UNSUPPORTED_OPERATION, {
      operation: 'signTransaction',
    });
  }

  /**
   *
   * @param transaction
   * @returns A promise that resolves to the transaction's response
   */
  async sendTransaction(_transaction: Deferrable<TransactionRequest>): Promise<TransactionResponse> {
    this._checkProvider('sendTransaction');

    const evmAddress = await this.getAddress();

    // estimateResources requires the from parameter.
    // However, when creating the contract, there is no from parameter in the tx
    const transaction = {
      from: evmAddress,
      ..._transaction,
    };

    const { gasLimit, safeStorage: storageLimit } = await this.provider.estimateResources(transaction);

    const tx = await this.populateTransaction(transaction);
    const data = tx.data?.toString() ?? '0x';

    const createParams = [
      data,
      toBN(tx.value),
      toBN(gasLimit),
      toBN(storageLimit.isNegative() ? 0 : storageLimit),
      (tx.accessList as any) || [],
    ] as const;

    const callParams = [
      tx.to,
      ...createParams,
    ] as const;

    const extrinsic = tx.to
      ? this.provider.api.tx.evm.call(...callParams)
      : this.provider.api.tx.evm.create(...createParams);

    await extrinsic.signAsync(this.substrateAddress);

    return new Promise((resolve, reject) => {
      extrinsic
        .send((result: SubmittableResult) => {
          handleTxResponse(result, this.provider.api)
            .then(() => {
              resolve({
                hash: extrinsic.hash.toHex(),
                from: tx.from || '',
                confirmations: 0,
                nonce: toBN(tx.nonce).toNumber(),
                gasLimit: BigNumber.from(tx.gasLimit || '0'),
                gasPrice: BigNumber.from(1),
                data: dataToString(data),
                value: BigNumber.from(tx.value || '0'),
                chainId: +this.provider.api.consts.evmAccounts.chainId.toString(),
                wait: (_confirmations?: number): Promise<TransactionReceipt> => {
                  const hex = result.status.isInBlock
                    ? result.status.asInBlock.toHex()
                    : result.status.asFinalized.toHex();

                  // tx was just mined so won't be null
                  return this.provider.getReceiptAtBlockFromChain(
                    extrinsic.hash.toHex(),
                    hex
                  ) as Promise<TransactionReceipt>;
                },
              });
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  /**
   *
   * @param message The message to sign
   * @returns A promise that resolves to the signed hash of the message
   */
  async signMessage(message: Bytes | string): Promise<string> {
    const evmAddress = await this.queryEvmAddress();
    return this._signMessage(evmAddress, message);
  }

  async _signMessage(evmAddress: string, message: Bytes | string): Promise<string> {
    if (!evmAddress) {
      return logger.throwError('No binding evm address');
    }

    if (!this.signer.signRaw) {
      return logger.throwError('Need to implement signRaw method');
    }

    const messagePrefix = '\x19Ethereum Signed Message:\n';
    if (typeof message === 'string') {
      message = toUtf8Bytes(message);
    }
    const msg = u8aToHex(concat([toUtf8Bytes(messagePrefix), toUtf8Bytes(String(message.length)), message]));

    const result = await this.signer.signRaw({
      address: evmAddress,
      data: msg,
      type: 'bytes',
    });

    return joinSignature(result.signature);
  }

  async _signTypedData(
    _domain: TypedDataDomain,
    _types: Record<string, Array<TypedDataField>>,
    _value: Record<string, any>
  ): Promise<string> {
    return logger.throwError('_signTypedData is unsupported', Logger.errors.UNSUPPORTED_OPERATION, {
      operation: '_signTypedData',
    });
  }
}
