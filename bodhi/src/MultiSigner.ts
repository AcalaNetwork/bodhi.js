import type { Signer, SignerResult } from '@polkadot/api/types';
import type { SignerPayloadJSON } from '@polkadot/types/types';

export class MultiSigner implements Signer {
  #signers: Record<string, Signer>;

  constructor(signers: Record<string, Signer> = {}) {
    this.#signers = signers;
  }

  public addSigner(address: string, signer: Signer): void {
    this.#signers[address] = signer;
  }

  public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
    const signer = this.#signers[payload.address];

    if (!signer || typeof signer.signPayload !== 'function') {
      throw new Error(`Can't find the signer for ${payload.address}`);
    }

    return signer.signPayload(payload);
  }

  static isMultiSigner(signer: any): signer is MultiSigner {
    return !!signer.addSigner && !!signer.signPayload;
  }
}
