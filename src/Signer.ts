/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TransactionReceipt } from '@ethersproject/abstract-provider';
import {
  TransactionRequest,
  TransactionResponse
} from '@ethersproject/abstract-provider';
import {
  Signer as Abstractsigner,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import { Bytes, concat, joinSignature } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { Deferrable, defineReadOnly } from '@ethersproject/properties';
import { toUtf8Bytes } from '@ethersproject/strings';
import { SubmittableResult } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { u8aConcat, u8aEq, u8aToHex } from '@polkadot/util';
import {
  blake2AsU8a,
  decodeAddress,
  isEthereumAddress
} from '@polkadot/util-crypto';
import { Provider } from './Provider';
import { SigningKey } from './SigningKey';
import { dataToString, handleTxResponse, toBN } from './utils';

const logger = new Logger('bodhi/0.0.1');

export class Signer extends Abstractsigner implements TypedDataSigner {
  readonly provider: Provider;
  readonly signingKey: SigningKey;
  readonly _substrateAddress: string;

  constructor(provider: Provider, address: string, signingKey: SigningKey) {
    super();

    defineReadOnly(this, 'provider', provider);
    defineReadOnly(this, 'signingKey', signingKey);

    this.provider.api.setSigner(signingKey);

    if (typeof address === 'string' && isEthereumAddress(address)) {
      logger.throwError('expect substrate address');
    } else {
      try {
        decodeAddress(address);
        defineReadOnly(this, '_substrateAddress', address);
      } catch {
        logger.throwArgumentError('invalid address', 'address', address);
      }
    }
  }

  connect(provider: Provider): Signer {
    return logger.throwError(
      'cannot alter JSON-RPC Signer connection',
      Logger.errors.UNSUPPORTED_OPERATION,
      {
        operation: 'connect'
      }
    );
  }

  async isClaimed(evmAddress?: string): Promise<boolean> {
    const rpcEvmAddress = await this.queryEvmAddress();

    if (!rpcEvmAddress) return false;
    if (!evmAddress) return true;
    if (rpcEvmAddress === evmAddress) {
      return true;
    }

    return logger.throwError(
      'An evm account already exists to bind to this account'
    );
  }

  async getAddress(): Promise<string> {
    const address = await this.queryEvmAddress();
    if (address) {
      return address;
    } else {
      // default address
      return this.computeDefaultEvmAddress();
    }
  }

  async queryEvmAddress(): Promise<string> {
    const address = await this.provider.api.query.evmAccounts.evmAddresses(
      this._substrateAddress
    );

    if (!address.isEmpty) {
      const evmAddress = getAddress(address.toString());
      return evmAddress;
    }

    return '';
  }

  computeDefaultEvmAddress(): string {
    const address = this._substrateAddress;
    const publicKey = decodeAddress(address);

    const isStartWithEvm = u8aEq('evm:', publicKey.slice(0, 4));

    if (isStartWithEvm) {
      return getAddress(u8aToHex(publicKey.slice(4, 24)));
    }

    return getAddress(
      u8aToHex(blake2AsU8a(u8aConcat('evm:', publicKey), 256).slice(0, 20))
    );
  }

  async getSubstrateAddress(): Promise<string> {
    return this._substrateAddress;
  }

  async claimEvmAccount(evmAddress: string): Promise<void> {
    const isConnented = await this.isClaimed(evmAddress);

    if (isConnented) return;

    const publicKey = decodeAddress(this._substrateAddress);
    const data = 'acala evm:' + Buffer.from(publicKey).toString('hex');
    const signature = await this._signMessage(evmAddress, data);
    const extrinsic = this.provider.api.tx.evmAccounts.claimAccount(
      evmAddress,
      signature
    );

    await extrinsic.signAsync(this._substrateAddress);

    await new Promise<void>((resolve, reject) => {
      extrinsic
        .send((result: SubmittableResult) => {
          handleTxResponse(result, this.provider.api)
            .then(() => {
              resolve();
            })
            .catch(({ message, result }) => {
              if (message === 'evmAccounts.AccountIdHasMapped') {
                resolve();
              }
              reject(message);
            });
        })
        .catch((error) => {
          reject(error && error.message);
        });
    });
  }

  async claimDefaultAccount(): Promise<void> {
    const extrinsic = this.provider.api.tx.evmAccounts.claimDefaultAccount();

    await extrinsic.signAsync(this._substrateAddress);

    await new Promise<void>((resolve, reject) => {
      extrinsic
        .send((result: SubmittableResult) => {
          handleTxResponse(result, this.provider.api)
            .then(() => {
              resolve();
            })
            .catch(({ message, result }) => {
              if (message === 'evmAccounts.AccountIdHasMapped') {
                resolve();
              }
              reject(message);
            });
        })
        .catch((error) => {
          reject(error && error.message);
        });
    });
  }

  signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    return logger.throwError(
      'signing transactions is unsupported',
      Logger.errors.UNSUPPORTED_OPERATION,
      {
        operation: 'signTransaction'
      }
    );
  }

  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    this._checkProvider('sendTransaction');

    const signerAddress = await this.getSubstrateAddress();
    const tx = await this.populateTransaction(transaction);

    let extrinsic: SubmittableExtrinsic<'promise'>;

    // @TODO create contract
    if (!tx.to) {
      extrinsic = this.provider.api.tx.evm.create(
        tx.data,
        toBN(tx.value) || '0',
        toBN(tx.gasLimit),
        0xffffffff
      );
    } else {
      extrinsic = this.provider.api.tx.evm.call(
        tx.to,
        tx.data,
        toBN(tx.value) || '0',
        toBN(tx.gasLimit),
        0xffffffff
      );
    }

    await extrinsic.signAsync(signerAddress);

    return new Promise((resolve, reject) => {
      extrinsic
        .send((result: SubmittableResult) => {
          handleTxResponse(result, this.provider.api)
            .then(() => {
              resolve({
                hash: extrinsic.hash.toHex(),
                from: tx.from,
                confirmations: 0,
                nonce: toBN(tx.nonce).toNumber(),
                gasLimit: BigNumber.from(tx.gasLimit || '0'),
                gasPrice: BigNumber.from(0),
                data: dataToString(tx.data),
                value: BigNumber.from(tx.value || '0'),
                chainId: 1024,
                wait: (confirmations?: number): Promise<TransactionReceipt> => {
                  return this.provider._resolveTransactionReceipt(
                    extrinsic.hash.toHex(),
                    result.status.asInBlock.toHex(),
                    tx.from
                  );
                }
              });
            })
            .catch(({ message, result }) => {
              reject(message);
            });
        })
        .catch((error) => {
          reject(error && error.message);
        });
    });
  }

  async signMessage(message: Bytes | string): Promise<string> {
    const evmAddress = await this.queryEvmAddress();
    return this._signMessage(evmAddress, message);
  }

  async _signMessage(
    evmAddress: string,
    message: Bytes | string
  ): Promise<string> {
    if (!evmAddress) {
      return logger.throwError('No binding evm address');
    }
    const messagePrefix = '\x19Ethereum Signed Message:\n';
    if (typeof message === 'string') {
      message = toUtf8Bytes(message);
    }
    const msg = u8aToHex(
      concat([
        toUtf8Bytes(messagePrefix),
        toUtf8Bytes(String(message.length)),
        message
      ])
    );

    const result = await this.signingKey.signRaw({
      address: evmAddress,
      data: msg,
      type: 'bytes'
    });

    return joinSignature(result.signature);
  }

  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: Record<string, any>
  ): Promise<string> {
    return logger.throwError(
      '_signTypedData is unsupported',
      Logger.errors.UNSUPPORTED_OPERATION,
      {
        operation: '_signTypedData'
      }
    );
  }
}
