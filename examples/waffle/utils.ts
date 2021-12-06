import { TestProvider, TestAccountSigningKey, Provider, Signer } from '@acala-network/bodhi';
import { WsProvider, Keyring } from '@polkadot/api';
import { ApiOptions, KeyringPair } from '@polkadot/api/types';
import { createTestPairs } from '@polkadot/keyring/testingPairs';

const DEFAULT_URL = 'ws://127.0.0.1:9944';

export const getTestProvider = (urlOverwrite?: string, opts?: ApiOptions): TestProvider => {
  const url = urlOverwrite || process.env.ENDPOINT_URL || DEFAULT_URL;

  const provider = new TestProvider({
    provider: new WsProvider(url),
    ...opts
  });

  console.log(`test provider connected to ${url}`);

  return provider;
};

export const setup = async (urlOverwrite?: string) => {
  const url = urlOverwrite || process.env.ENDPOINT_URL || DEFAULT_URL;
  const seed = process.env.SEED;

  const provider = new Provider({
    provider: new WsProvider(url)
  });

  await provider.api.isReady;

  let pair: KeyringPair;
  if (seed) {
    const keyring = new Keyring({ type: 'sr25519' });
    pair = keyring.addFromUri(seed);
  } else {
    const testPairs = createTestPairs();
    pair = testPairs.alice;
  }

  const signingKey = new TestAccountSigningKey(provider.api.registry);
  signingKey.addKeyringPair(pair);

  const wallet = new Signer(provider, pair.address, signingKey);
  return {
    wallet,
    provider,
    pair
  };
};
