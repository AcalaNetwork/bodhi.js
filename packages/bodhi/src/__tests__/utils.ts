import { BodhiProvider } from '@acala-network/eth-providers';
import { KeyringPair } from '@polkadot/keyring/types';
import { WsProvider } from '@polkadot/api';
import { createTestPairs } from '@polkadot/keyring';

import { BodhiSigner } from '../BodhiSigner';

export const getTestUtils = async (
  url = 'ws://localhost:9944',
  claimDefault = true,
): Promise<{
  wallets: BodhiSigner[];
  pairs: KeyringPair[];
  provider: BodhiProvider;
}> => {
  const provider = new BodhiProvider({
    provider: new WsProvider(url),
  });
  await provider.isReady();

  const { alice } = createTestPairs();
  const pairs = [alice];

  const wallets: BodhiSigner[] = [];
  for (const pair of pairs) {
    const wallet = BodhiSigner.fromPair(provider, pair);

    const isClaimed = await wallet.isClaimed();
    if (!isClaimed && claimDefault) {
      await wallet.claimDefaultAccount();
    }

    wallets.push(wallet);
  }

  return {
    wallets,
    pairs,
    provider,
  };
};
