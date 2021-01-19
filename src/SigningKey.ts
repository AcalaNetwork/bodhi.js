import { BytesLike, SignatureLike } from '@ethersproject/bytes';
import { SigningKey as EthersSigningKey } from '@ethersproject/signing-key';
import { Signer as InjectedSigner } from '@polkadot/api/types';
import type { SignerPayloadRaw } from '@polkadot/types/types';
import { computeAddress, recoverAddress } from '@ethersproject/transactions';

export abstract class SigningKey {
  abstract signRaw(options: SignerPayloadRaw): Promise<SignatureLike>;
}

export class WalletSigningKey extends SigningKey implements SigningKey {
  readonly #signingKey: EthersSigningKey;
  readonly _isWalletSigningKey: boolean;
  readonly curve: string;

  get privateKey(): string {
    return this.#signingKey.privateKey;
  }

  get publicKey(): string {
    return this.#signingKey.publicKey;
  }

  get address(): string {
    return computeAddress(this.publicKey);
  }

  constructor(privateKey?: BytesLike) {
    super();

    this._isWalletSigningKey = true;
    this.#signingKey = new EthersSigningKey(privateKey);
    this.curve = this.#signingKey.curve;
  }

  async signRaw(payload: SignerPayloadRaw): Promise<SignatureLike> {
    return this.#signingKey.signDigest(payload.data);
  }

  static isSigningKey(value: any): value is WalletSigningKey {
    return !!(value && value._isWalletSigningKey);
  }
}
export class InjectedSigningKey extends SigningKey implements SigningKey {
  readonly #injectedSigner: InjectedSigner;
  readonly _isSigningKey: boolean;

  constructor(injectedSigner: InjectedSigner) {
    super();
    this.#injectedSigner = injectedSigner;
    this._isSigningKey = true;
  }

  async signRaw(payload: SignerPayloadRaw): Promise<SignatureLike> {
    const result = await this.#injectedSigner.signRaw(payload);
    return result.signature;
  }
}
