import { Signer } from '@polkadot/api/types';

export type SigningKey = Signer;

// export class AccountSigner {
//   readonly #keyringPair: KeyringPair;

//   readonly #registry: Registry;

//   readonly #signDelay: number;

//   constructor(registry: Registry, keyringPair: KeyringPair, signDelay = 0) {
//     this.#keyringPair = keyringPair;
//     this.#registry = registry;
//     this.#signDelay = signDelay;
//   }

//   public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
//     assert(
//       payload.address === this.#keyringPair.address,
//       'Signer does not have the keyringPair'
//     );

//     return new Promise((resolve): void => {
//       setTimeout((): void => {
//         const signed = this.#registry
//           .createType('ExtrinsicPayload', payload, { version: payload.version })
//           .sign(this.#keyringPair);

//         resolve({
//           id: ++id,
//           ...signed
//         });
//       }, this.#signDelay);
//     });
//   }

//   public async signRaw({
//     address,
//     data
//   }: SignerPayloadRaw): Promise<SignerResult> {
//     assert(
//       address === this.#keyringPair.address,
//       'Signer does not have the keyringPair'
//     );

//     return new Promise((resolve): void => {
//       setTimeout((): void => {
//         const signature = u8aToHex(this.#keyringPair.sign(hexToU8a(data)));

//         resolve({
//           id: ++id,
//           signature
//         });
//       }, this.#signDelay);
//     });
//   }
// }

// export class WalletSigningKey extends SigningKey implements SigningKey {
//   readonly #signingKey: EthersSigningKey;
//   readonly _isWalletSigningKey: boolean;
//   readonly curve: string;

//   get privateKey(): string {
//     return this.#signingKey.privateKey;
//   }

//   get publicKey(): string {
//     return this.#signingKey.publicKey;
//   }

//   get address(): string {
//     return computeAddress(this.publicKey);
//   }

//   constructor(privateKey?: BytesLike) {
//     super();

//     this._isWalletSigningKey = true;
//     this.#signingKey = new EthersSigningKey(privateKey);
//     this.curve = this.#signingKey.curve;
//   }

//   async signRaw(payload: SignerPayloadRaw): Promise<SignatureLike> {
//     return this.#signingKey.signDigest(payload.data);
//   }

//   static isSigningKey(value: any): value is WalletSigningKey {
//     return !!(value && value._isWalletSigningKey);
//   }
// }
