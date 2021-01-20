import {
  ExternallyOwnedAccount,
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import { getAddress } from '@ethersproject/address';
import { BigNumber } from '@ethersproject/bignumber';
import {
  Bytes,
  BytesLike,
  isHexString,
  joinSignature,
  SignatureLike
} from '@ethersproject/bytes';
import { hashMessage, _TypedDataEncoder } from '@ethersproject/hash';
import { defaultPath, HDNode, Mnemonic } from '@ethersproject/hdnode';
import { encryptKeystore, ProgressCallback } from '@ethersproject/json-wallets';
import { Logger } from '@ethersproject/logger';
import { Deferrable, defineReadOnly } from '@ethersproject/properties';
import { computeAddress, recoverAddress } from '@ethersproject/transactions';
import { SubmittableResult } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import {
  Provider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse
} from './Provider';
import { WalletSigningKey } from './SigningKey';
import { dataToString, handleTxResponse, toBN } from './utils';

const logger = new Logger('bodhi/0.0.1');

function isAccount(value: any): value is ExternallyOwnedAccount {
  return (
    // eslint-disable-next-line
    value != null && isHexString(value.privateKey, 32) && value.address != null
  );
}

function hasMnemonic(value: any): value is { mnemonic: Mnemonic } {
  const mnemonic = value.mnemonic;

  return mnemonic && mnemonic.phrase;
}
export class Wallet
  extends Signer
  implements ExternallyOwnedAccount, TypedDataSigner {
  // @ts-ignore strictPropertyInitialization
  readonly address: string;

  // @ts-ignore
  readonly provider: Provider;
  readonly keyringPair: KeyringPair;

  // Wrapping the _signingKey and _mnemonic in a getter function prevents
  // leaking the private key in console.log; still, be careful! :)
  // @ts-ignore strictPropertyInitialization
  readonly _signingKey?: () => WalletSigningKey;
  // @ts-ignore strictPropertyInitialization
  readonly _mnemonic: () => Mnemonic;

  constructor(
    provider: Provider,
    keyringPair: KeyringPair,
    privateKey?: BytesLike | ExternallyOwnedAccount | WalletSigningKey
  ) {
    logger.checkNew(new.target, Wallet);

    super();

    if (isAccount(privateKey)) {
      const signingKey = new WalletSigningKey(privateKey.privateKey);
      defineReadOnly(this, '_signingKey', () => signingKey);
      defineReadOnly(this, 'address', computeAddress(this.publicKey));

      if (this.address !== getAddress(privateKey.address)) {
        logger.throwArgumentError(
          'privateKey/address mismatch',
          'privateKey',
          '[REDACTED]'
        );
      }

      if (hasMnemonic(privateKey)) {
        const srcMnemonic = privateKey.mnemonic;
        defineReadOnly(this, '_mnemonic', () => ({
          phrase: srcMnemonic.phrase,
          path: srcMnemonic.path || defaultPath,
          locale: srcMnemonic.locale || 'en'
        }));
        const mnemonic = this.mnemonic;
        const node = HDNode.fromMnemonic(
          mnemonic.phrase,
          null,
          mnemonic.locale
        ).derivePath(mnemonic.path);
        if (computeAddress(node.privateKey) !== this.address) {
          logger.throwArgumentError(
            'mnemonic/address mismatch',
            'privateKey',
            '[REDACTED]'
          );
        }
      } else {
        defineReadOnly(this, '_mnemonic', (): Mnemonic => null);
      }
    } else {
      if (WalletSigningKey.isSigningKey(privateKey)) {
        /* istanbul ignore if */
        if (privateKey.curve !== 'secp256k1') {
          logger.throwArgumentError(
            'unsupported curve; must be secp256k1',
            'privateKey',
            '[REDACTED]'
          );
        }
        defineReadOnly(this, '_signingKey', () => privateKey);
      } else {
        const signingKey = new WalletSigningKey(privateKey);
        defineReadOnly(this, '_signingKey', () => signingKey);
      }
      defineReadOnly(this, '_mnemonic', (): Mnemonic => null);
      defineReadOnly(this, 'address', computeAddress(this.publicKey));
    }

    // polkadot
    const keyring = new Keyring();
    defineReadOnly(
      this,
      'keyringPair',
      keyringPair || keyring.createFromUri(this.privateKey)
    );

    /* istanbul ignore if */
    if (provider && !Provider.isProvider(provider)) {
      logger.throwArgumentError('invalid provider', 'provider', provider);
    }

    defineReadOnly(this, 'provider', provider || null);
  }

  get mnemonic(): Mnemonic {
    return this._mnemonic();
  }

  get privateKey(): string {
    return this._signingKey().privateKey;
  }

  get publicKey(): string {
    return this._signingKey().publicKey;
  }

  getAddress(): Promise<string> {
    return Promise.resolve(this.address);
  }

  // @ts-ignore
  connect(provider: Provider): Wallet {
    return new Wallet(provider, this.keyringPair, this.privateKey);
  }

  signTransaction(transaction: TransactionRequest): Promise<string> {
    return logger.throwError(
      'signing transactions is unsupported',
      Logger.errors.UNSUPPORTED_OPERATION,
      {
        operation: 'signTransaction'
      }
    );
  }

  async signMessage(message: Bytes | string): Promise<string> {
    return joinSignature(
      await this._signingKey().signRaw({
        address: '',
        data: hashMessage(message),
        type: 'bytes'
      })
    );
  }

  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
  ): Promise<string> {
    // Populate any ENS names
    const populated = await _TypedDataEncoder.resolveNames(
      domain,
      types,
      value,
      (name: string) => {
        if (this.provider == null) {
          logger.throwError(
            'cannot resolve ENS names without a provider',
            Logger.errors.UNSUPPORTED_OPERATION,
            {
              operation: 'resolveName'
            }
          );
        }
        return this.provider.resolveName(name);
      }
    );

    return joinSignature(
      await this._signingKey().signRaw({
        address: '',
        data: _TypedDataEncoder.hash(populated.domain, types, populated.value),
        type: 'bytes'
      })
    );
  }

  encrypt(
    password: Bytes | string,
    options?: any,
    progressCallback?: ProgressCallback
  ): Promise<string> {
    if (typeof options === 'function' && !progressCallback) {
      progressCallback = options;
      options = {};
    }

    if (progressCallback && typeof progressCallback !== 'function') {
      throw new Error('invalid callback');
    }

    if (!options) {
      options = {};
    }

    return encryptKeystore(this, password, options, progressCallback);
  }

  // Populates all fields in a transaction, signs it and sends it to the network
  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    this._checkProvider('sendTransaction');
    return this.populateTransaction(transaction).then((tx) => {
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

      return new Promise((resolve, reject) => {
        extrinsic
          .signAndSend(this.keyringPair, (result: SubmittableResult) => {
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
                  wait: (
                    confirmations?: number
                  ): Promise<TransactionReceipt> => {
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
    });
  }

  async isConnented(evmAddress?: string): Promise<boolean> {
    const _address = await this.provider.api.query.evmAccounts.evmAddresses(
      this.keyringPair.address
    );

    const _evmAddress = !_address.isEmpty ? getAddress(_address.toString()) : '';

    if (!_evmAddress) return false;

    if (!evmAddress) return true;

    if (_evmAddress === evmAddress) return true;

    return logger.throwError(
      'An evm account already exists to bind to this account'
    );
  }

  async claimEvmAccount() {
    const isConnented = await this.isConnented();

    if (isConnented) return;

    const data =
      'acala evm:' + Buffer.from(this.keyringPair.publicKey).toString('hex');
    const signature = await this.signMessage(data);
    const extrinsic = this.provider.api.tx.evmAccounts.claimAccount(
      this.address,
      signature
    );
    return new Promise<void>((resolve, reject) => {
      extrinsic
        .signAndSend(this.keyringPair, (result: SubmittableResult) => {
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
}

export function verifyMessage(
  message: Bytes | string,
  signature: SignatureLike
): string {
  return recoverAddress(hashMessage(message), signature);
}

export function verifyTypedData(
  domain: TypedDataDomain,
  types: Record<string, Array<TypedDataField>>,
  value: Record<string, any>,
  signature: SignatureLike
): string {
  return recoverAddress(
    _TypedDataEncoder.hash(domain, types, value),
    signature
  );
}
