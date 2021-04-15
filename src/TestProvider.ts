import { WsProvider } from "@polkadot/api";
import { ApiOptions } from '@polkadot/api/types';
import { createTestPairs } from "@polkadot/keyring/testingPairs";
import { Provider } from "./Provider";
import { Signer } from "./Signer";
import { TestAccountSigningKey } from "./TestAccountSigningKey";

export class TestProvider extends Provider {
  constructor(_apiOptions?: ApiOptions) {
    super({ provider: new WsProvider('ws://127.0.0.1:9944'), ..._apiOptions });
  }

  async getWallets(): Promise<Signer[]> {
    const {alice, alice_stash, bob, bob_stash } = createTestPairs();

    const pairs = [alice, alice_stash, bob, bob_stash];

    const signingKey = new TestAccountSigningKey(this.api.registry);

    signingKey.addKeyringPair(pairs);

    await this.api.isReady;

    let wallets: Signer[] = [];

    for (const pair of pairs) {
      const wallet = new Signer(this, pair.address, signingKey);

      const isClaimed = await wallet.isClaimed();

      if (!isClaimed) {
        await wallet.claimDefaultAccount();
      }

      wallets.push(wallet);
    }

    return wallets;
  }
}
