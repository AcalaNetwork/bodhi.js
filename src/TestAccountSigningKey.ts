import type {
  SigningKey,
  SigningKeyResult,
  SigningPayloadJSON
} from './SigningKey';
import type { KeyringOptions, KeyringPair } from '@polkadot/keyring/types';
import { createTestPairs } from '@polkadot/keyring/testingPairs';

import type { Registry } from '@polkadot/types/types';

let id = 0;

export class TestAccountSigningKey implements SigningKey {
  #keyringPairs: KeyringPair[];
  readonly #registry: Registry;

  constructor(registry: Registry, options?: KeyringOptions, isDerived = true) {
    const keypairMap = createTestPairs(options, isDerived);

    this.#keyringPairs = Object.values(keypairMap);
    this.#registry = registry;
  }

  public async signPayload(
    payload: SigningPayloadJSON
  ): Promise<SigningKeyResult> {
    const findKeyringPair = this.#keyringPairs.find(
      (pair) => pair.address === payload.address
    );

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

  public addKeyringPair(
    ...keyringPairs: (KeyringPair | ConcatArray<KeyringPair>)[]
  ): void {
    this.#keyringPairs = this.#keyringPairs.concat(...keyringPairs);
  }
}
