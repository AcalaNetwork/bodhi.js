import type { KeyringPair } from '@polkadot/keyring/types';
import type { Registry } from '@polkadot/types/types';
import { addressEq } from '@polkadot/util-crypto';
import type { SigningKey, SigningKeyResult, SigningPayloadJSON } from './SigningKey';

let id = 0;

export class TestAccountSigningKey implements SigningKey {
  #keyringPairs: KeyringPair[];
  readonly #registry: Registry;

  constructor(registry: Registry) {
    this.#keyringPairs = [];
    this.#registry = registry;
  }

  public async signPayload(payload: SigningPayloadJSON): Promise<SigningKeyResult> {
    const findKeyringPair = this.#keyringPairs.find((pair) => addressEq(pair.address, payload.address));

    if (!findKeyringPair) {
      throw new Error(`Can't find the keyringpair for ${payload.address}`);
    }

    return new Promise((resolve): void => {
      const signed = this.#registry
        .createType('ExtrinsicPayload', payload, { version: payload.version })
        .sign(findKeyringPair);

      resolve({ id: ++id, ...signed });
    });
  }

  public addKeyringPair(...keyringPairs: (KeyringPair | ConcatArray<KeyringPair>)[]): void {
    this.#keyringPairs = this.#keyringPairs.concat(...keyringPairs);
  }
}
