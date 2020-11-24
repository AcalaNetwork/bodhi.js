import {
  ExternallyOwnedAccount,
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import { getAddress } from '@ethersproject/address';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import {
  arrayify,
  Bytes,
  BytesLike,
  concat,
  hexDataSlice,
  isHexString,
  joinSignature,
  SignatureLike
} from '@ethersproject/bytes';
import { hashMessage, _TypedDataEncoder } from '@ethersproject/hash';
import {
  defaultPath,
  entropyToMnemonic,
  HDNode,
  Mnemonic
} from '@ethersproject/hdnode';
import {
  decryptJsonWallet,
  decryptJsonWalletSync,
  encryptKeystore,
  ProgressCallback
} from '@ethersproject/json-wallets';
import { keccak256 } from '@ethersproject/keccak256';
import { Logger } from '@ethersproject/logger';
import {
  Deferrable,
  defineReadOnly,
  resolveProperties
} from '@ethersproject/properties';
import { randomBytes } from '@ethersproject/random';
import { SigningKey } from '@ethersproject/signing-key';
import {
  computeAddress,
  recoverAddress,
  serialize,
  UnsignedTransaction
} from '@ethersproject/transactions';
import { Wordlist } from '@ethersproject/wordlists';
import { SubmittableResult } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import {
  bufferToU8a,
  hexToBn,
  isBuffer,
  isHex,
  isU8a,
  u8aToBn,
  u8aToHex
} from '@polkadot/util';
import BN from 'bn.js';
import {
  Provider,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse
} from './Provider';

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

function toBN(bigNumberis: BigNumberish) {
  if (isU8a(bigNumberis)) {
    return u8aToBn(bigNumberis);
  }
  if (isHex(bigNumberis)) {
    return hexToBn(bigNumberis);
  }

  if (BigNumber.isBigNumber(bigNumberis)) {
    return hexToBn(bigNumberis.toHexString());
  }

  return new BN(bigNumberis as any);
}

function dataToString(bytes: BytesLike) {
  if (isBuffer(bytes)) {
    return u8aToHex(bufferToU8a(bytes));
  }
  if (isU8a(bytes)) {
    return u8aToHex(bytes);
  }
  if (Array.isArray(bytes)) {
    return u8aToHex(Buffer.from(bytes));
  }

  return bytes as string;
}

function handleTxResponse(
  result: SubmittableResult,
  api: any
): Promise<{
  result: SubmittableResult;
  message?: string;
}> {
  return new Promise((resolve, reject) => {
    if (result.status.isFinalized || result.status.isInBlock) {
      const createdFailed = result.findRecord('evm', 'CreatedFailed');
      const executedFailed = result.findRecord('evm', 'ExecutedFailed');

      const isEvmFailed = createdFailed || executedFailed;

      result.events
        .filter(({ event: { section } }: any): boolean => section === 'system')
        .forEach((event: any): void => {
          const {
            event: { data, method }
          } = event;
          if (method === 'ExtrinsicFailed') {
            const [dispatchError] = data;
            let message = dispatchError.type;

            if (dispatchError.isModule) {
              try {
                const mod = dispatchError.asModule;
                const error = api.registry.findMetaError(
                  new Uint8Array([mod.index.toNumber(), mod.error.toNumber()])
                );
                message = `${error.section}.${error.name}`;
              } catch (error) {
                // swallow
              }
            }

            reject({ message, result });
          } else if (method === 'ExtrinsicSuccess') {
            if (isEvmFailed) {
              reject({ message: 'revert', result });
            }
            resolve({ result });
          }
        });
    } else if (result.isError) {
      reject({ result });
    }
  });
}

export class Wallet
  extends Signer
  implements ExternallyOwnedAccount, TypedDataSigner {
  // @ts-ignore strictPropertyInitialization
  readonly address: string;

  // @ts-ignore
  readonly provider: Provider;
  readonly keyringPair?: KeyringPair;

  // Wrapping the _signingKey and _mnemonic in a getter function prevents
  // leaking the private key in console.log; still, be careful! :)
  // @ts-ignore strictPropertyInitialization
  readonly _signingKey: () => SigningKey;
  // @ts-ignore strictPropertyInitialization
  readonly _mnemonic: () => Mnemonic;

  constructor(
    privateKey: BytesLike | ExternallyOwnedAccount,
    provider?: Provider
  ) {
    logger.checkNew(new.target, Wallet);

    super();

    if (isAccount(privateKey)) {
      const signingKey = new SigningKey(privateKey.privateKey);
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
      if (SigningKey.isSigningKey(privateKey)) {
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
        const signingKey = new SigningKey(privateKey);
        defineReadOnly(this, '_signingKey', () => signingKey);
      }
      defineReadOnly(this, '_mnemonic', (): Mnemonic => null);
      defineReadOnly(this, 'address', computeAddress(this.publicKey));
    }

    // polkadot
    const keyring = new Keyring();
    defineReadOnly(this, 'keyringPair', keyring.createFromUri(this.privateKey));

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
    return new Wallet(this, provider);
  }

  signTransaction(transaction: TransactionRequest): Promise<string> {
    return resolveProperties(transaction).then((tx) => {
      if (tx.from != null) {
        if (getAddress(tx.from) !== this.address) {
          logger.throwArgumentError(
            'transaction from address mismatch',
            'transaction.from',
            transaction.from
          );
        }
        delete tx.from;
      }

      const signature = this._signingKey().signDigest(
        keccak256(serialize(<UnsignedTransaction>tx))
      );
      return serialize(<UnsignedTransaction>tx, signature);
    });
  }

  async signMessage(message: Bytes | string): Promise<string> {
    return joinSignature(this._signingKey().signDigest(hashMessage(message)));
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
      this._signingKey().signDigest(
        _TypedDataEncoder.hash(populated.domain, types, populated.value)
      )
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

  /**
   *  Static methods to create Wallet instances.
   */
  static createRandom(options?: any): Wallet {
    let entropy: Uint8Array = randomBytes(16);

    if (!options) {
      options = {};
    }

    if (options.extraEntropy) {
      entropy = arrayify(
        hexDataSlice(keccak256(concat([entropy, options.extraEntropy])), 0, 16)
      );
    }

    const mnemonic = entropyToMnemonic(entropy, options.locale);
    return Wallet.fromMnemonic(mnemonic, options.path, options.locale);
  }

  static fromEncryptedJson(
    json: string,
    password: Bytes | string,
    progressCallback?: ProgressCallback
  ): Promise<Wallet> {
    return decryptJsonWallet(json, password, progressCallback).then(
      (account) => {
        return new Wallet(account);
      }
    );
  }

  static fromEncryptedJsonSync(json: string, password: Bytes | string): Wallet {
    return new Wallet(decryptJsonWalletSync(json, password));
  }

  static fromMnemonic(
    mnemonic: string,
    path?: string,
    wordlist?: Wordlist
  ): Wallet {
    if (!path) {
      path = defaultPath;
    }
    return new Wallet(
      HDNode.fromMnemonic(mnemonic, null, wordlist).derivePath(path)
    );
  }

  // Populates all fields in a transaction, signs it and sends it to the network
  sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    this._checkProvider('sendTransaction');
    return this.populateTransaction(transaction).then((tx) => {
      let extrinsic: SubmittableExtrinsic<'promise'>;
      // @TODO create contract
      if (!tx.to) {
        extrinsic = this.provider.api.tx.evm.create(
          tx.from,
          tx.data,
          toBN(tx.value) || '0',
          toBN(tx.gasLimit)
        );
      } else {
        extrinsic = this.provider.api.tx.evm.call(
          tx.from,
          tx.to,
          tx.data,
          toBN(tx.value) || '0',
          toBN(tx.gasLimit)
        );
      }

      return new Promise((resolve, reject) => {
        extrinsic.signAndSend(this.keyringPair, (result: SubmittableResult) => {
          handleTxResponse(result, this.provider.api)
            .then(() => {
              resolve({
                hash: extrinsic.hash.toHex(),
                from: tx.from,
                confirmations: 10,
                nonce: toBN(tx.nonce).toNumber(),
                gasLimit: BigNumber.from(6000000),
                gasPrice: BigNumber.from(100),
                data: dataToString(tx.data),
                value: BigNumber.from(100),
                chainId: 1024,
                wait: (confirmations?: number): Promise<TransactionReceipt> => {
                  return Promise.resolve({} as any);
                }
              });
            })
            .catch(({ message, result }) => {
              reject(message);
            });
        });
      });
    });
  }

  async claimEvmAccounts() {
    const data =
      'acala evm:' + Buffer.from(this.keyringPair.publicKey).toString('hex');
    const signature = await this.signMessage(data);
    const extrinsic = this.provider.api.tx.evmAccounts.claimAccount(
      this.address,
      signature
    );
    return new Promise<void>((resolve, reject) => {
      extrinsic.signAndSend(this.keyringPair, (result: SubmittableResult) => {
        handleTxResponse(result, this.provider.api)
          .then(() => {
            resolve();
          })
          .catch(({ message, result }) => {
            if (message === 'evmAccounts.EthAddressHasMapped') {
              resolve();
            }
            reject(message);
          });
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
