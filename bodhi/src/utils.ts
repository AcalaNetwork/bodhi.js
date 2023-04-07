/* eslint-disable prefer-promise-reject-errors */
import { BodhiProvider } from '@acala-network/eth-providers';
import { BigNumber } from '@ethersproject/bignumber';
import { BytesLike } from '@ethersproject/bytes';
import { WsProvider } from '@polkadot/api';
import { createTestPairs } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { bufferToU8a, isBuffer, isU8a, u8aToHex } from '@polkadot/util';
import { SubstrateSigner } from './SubstrateSigner';
import { BodhiSigner } from './BodhiSigner';

export const U32MAX = BigNumber.from('0xffffffff');
export const U64MAX = BigNumber.from('0xffffffffffffffff');

export const dataToString = (bytes: BytesLike): string => {
  if (isBuffer(bytes)) {
    return u8aToHex(bufferToU8a(bytes));
  }
  if (isU8a(bytes)) {
    return u8aToHex(bytes);
  }
  if (Array.isArray(bytes)) {
    return u8aToHex(Buffer.from(bytes));
  }

  return bytes as string;
};

export const getTestUtils = async (
  url: string = 'ws://localhost:9944'
): Promise<{
  wallets: BodhiSigner[];
  pairs: KeyringPair[];
  provider: BodhiProvider;
}> => {
  const provider = new BodhiProvider({
    provider: new WsProvider(url),
  });
  await provider.isReady();

  const { alice, alice_stash, bob, bob_stash } = createTestPairs();
  const pairs = [alice, alice_stash, bob, bob_stash];

  const substrateSigner = new SubstrateSigner(provider.api.registry, pairs);

  const wallets: BodhiSigner[] = [];
  for (const pair of pairs) {
    const wallet = new BodhiSigner(provider, pair.address, substrateSigner);

    const isClaimed = await wallet.isClaimed();
    if (!isClaimed) {
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
