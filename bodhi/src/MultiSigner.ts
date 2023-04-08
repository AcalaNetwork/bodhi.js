import type { Signer, SignerResult } from '@polkadot/api/types';
import type { SignerPayloadJSON } from '@polkadot/types/types';

export class MultiSigner implements Signer {
  #singers: Record<string, Signer>;

  constructor(singers: Record<string, Signer> = {}) {
    this.#singers = singers;
  }

  public addSigner(address: string, signer: Signer): void {
    this.#singers[address] = signer;
  }

  public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
    const signer = this.#singers[payload.address];

    if (!signer || typeof signer.signPayload !== 'function') {
      throw new Error(`Can't find the signer for ${payload.address}`);
    }

    return signer.signPayload(payload);
  }

  static isMultiSigner(signer: any): signer is MultiSigner {
    return !!signer.addSigner && !!signer.signPayload;
  }
}
