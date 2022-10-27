import type { KeyringPair } from '@polkadot/keyring/types';
import type { Registry } from '@polkadot/types/types';
import { addressEq } from '@polkadot/util-crypto';
import type { Signer, SignerResult } from '@polkadot/api/types';
import type { SignerPayloadJSON } from '@polkadot/types/types';

let id = 0;

/* ----------
   in prod we usually use the extension signer
   so this Signer is mostly for testing purpose
   with testing keyringPairs
                                     ---------- */
export class PolkaSigner implements Signer {
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
