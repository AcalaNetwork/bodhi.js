import type { KeyringPair } from '@polkadot/keyring/types';
import type { Registry, SignerPayloadJSON } from '@polkadot/types/types';
import type { Signer, SignerResult } from '@polkadot/api/types';

let id = 0;

export class SubstrateSigner implements Signer {
  #keyringPair: KeyringPair;
  #registry: Registry;

  constructor(registry: Registry, keyringPair: KeyringPair) {
    this.#keyringPair = keyringPair;
    this.#registry = registry;
  }

  public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
    const signed = this.#registry
      .createType('ExtrinsicPayload', payload, { version: payload.version })
      .sign(this.#keyringPair);

    return Promise.resolve({ id: ++id, ...signed });
  }
}
