import { addressEq } from '@polkadot/util-crypto';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { Registry, SignerPayloadJSON } from '@polkadot/types/types';
import type { Signer, SignerResult } from '@polkadot/api/types';

let id = 0;

export class SubstrateSigner implements Signer {
  #keyringPairs: KeyringPair[];
  #registry: Registry;

  constructor(registry: Registry, keyringPairs: KeyringPair[]) {
    this.#keyringPairs = keyringPairs;
    this.#registry = registry;
  }

  public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
    const targetKeyringPair = this.#keyringPairs.find((pair) => addressEq(pair.address, payload.address));

    if (!targetKeyringPair) {
      throw new Error(`Can't find the keyringpair for ${payload.address}`);
    }

    const signed = this.#registry
      .createType('ExtrinsicPayload', payload, { version: payload.version })
      .sign(targetKeyringPair);

    return Promise.resolve({ id: ++id, ...signed });
  }
}
