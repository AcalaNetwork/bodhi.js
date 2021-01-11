import {
  TransactionRequest,
  TransactionResponse
} from '@ethersproject/abstract-provider';
import {
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner
} from '@ethersproject/abstract-signer';
import { getAddress } from '@ethersproject/address';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Bytes, BytesLike, concat, joinSignature } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { Deferrable, defineReadOnly } from '@ethersproject/properties';
import { toUtf8Bytes } from '@ethersproject/strings';
import { SubmittableResult } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import {
  bufferToU8a,
  hexToBn,
  hexToString,
  isBuffer,
  isHex,
  isU8a,
  u8aToBn,
  u8aToHex
} from '@polkadot/util';
import { decodeAddress, isEthereumAddress } from '@polkadot/util-crypto';
import BN from 'bn.js';
import { Provider, TransactionReceipt } from './Provider';

const logger = new Logger('bodhi/0.0.1');

async function getExtensionSigner() {
  if (!(window as any).injectedWeb3) {
    return logger.throwError('expect polkadot extensions');
  }

  const injectedWeb3 = (window as any).injectedWeb3;

  const injected = await injectedWeb3['polkadot-js'].enable();

  return injected.signer;
}

function decodeMessage(reason: any, code: string) {
  const reasonString = JSON.stringify(reason).toLowerCase();
  let codeString = `0x${code.substr(138)}`.replace(/0+$/, '');

  // If the codeString is an odd number of characters, add a trailing 0
  if (codeString.length % 2 === 1) {
    codeString += '0';
  }

  return `${reasonString} ${hexToString(codeString)}`;
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
            const failed = createdFailed || executedFailed;
            if (failed) {
              reject({
                message: decodeMessage(
                  failed.event.data[1].toJSON(),
                  failed.event.data[2].toJSON() as string
                ),
                result
              });
            }
            resolve({ result });
          }
        });
    } else if (result.isError) {
      reject({ result });
    }
  });
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

export class ExtensionSigner extends Signer implements TypedDataSigner {
  // @ts-ignore
  readonly provider: Provider;
  _evmAddress: string | null;
  _substrateAddress: string;

  constructor(provider: Provider, address: string) {
    super();

    defineReadOnly(this, 'provider', provider);

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

  // @ts-ignore
  connect(provider: Provider): ExtensionSigner {
    return logger.throwError(
      'cannot alter JSON-RPC Signer connection',
      Logger.errors.UNSUPPORTED_OPERATION,
      {
        operation: 'connect'
      }
    );
  }

  async isBinded(): Promise<boolean> {
    const evmAddress = await this.getAddress();
    const substrateAddress = await this.getSubstrateAddress();
    return !!evmAddress && !!substrateAddress;
  }

  async getAddress(): Promise<string> {
    if (this._evmAddress) {
      return this._evmAddress;
    } else {
      const address = await this.provider.api.query.evmAccounts.evmAddresses(
        this._substrateAddress
      );
      if (!address.isEmpty) {
        const evmAddress = getAddress(address.toString());
        defineReadOnly(this, '_evmAddress', evmAddress);
        return evmAddress;
      }
    }

    return '';
  }

  async getSubstrateAddress(): Promise<string> {
    return Promise.resolve(this._substrateAddress);
  }

  async bindAccount(evmAddress: string) {
    const _evmAddress = await this.getAddress();

    if (_evmAddress && _evmAddress !== evmAddress) {
      logger.throwError(
        'An evm account already exists to bind to this account'
      );
      return;
    } else if (_evmAddress && _evmAddress === evmAddress) {
      return;
    }

    const publicKey = decodeAddress(this._substrateAddress);
    const data = 'acala evm:' + Buffer.from(publicKey).toString('hex');
    const signature = await this._signMessage(evmAddress, data);
    const extrinsic = this.provider.api.tx.evmAccounts.claimAccount(
      evmAddress,
      signature
    );
    await new Promise<void>((resolve, reject) => {
      extrinsic
        .signAndSend(this._substrateAddress, (result: SubmittableResult) => {
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
        toBN(tx.gasLimit)
      );
    } else {
      extrinsic = this.provider.api.tx.evm.call(
        tx.to,
        tx.data,
        toBN(tx.value) || '0',
        toBN(tx.gasLimit)
      );
    }

    return new Promise((resolve, reject) => {
      extrinsic
        .signAndSend(signerAddress, (result: SubmittableResult) => {
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
    const evmAddress = await this.getAddress();
    return this._signMessage(evmAddress, message);
  }

  async _signMessage(
    evmAddress: string,
    message: Bytes | string
  ): Promise<string> {
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

    const signer = await getExtensionSigner();
    const result = await signer.signRaw({ address: evmAddress, data: msg });
    return joinSignature(result.signature);
  }

  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
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
