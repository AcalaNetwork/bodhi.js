/* eslint-disable prefer-promise-reject-errors */
import { BigNumber } from '@ethersproject/bignumber';
import { BodhiProvider } from '@acala-network/eth-providers';
import { BodhiSigner } from './BodhiSigner';
import { BytesLike } from '@ethersproject/bytes';
import { KeyringPair } from '@polkadot/keyring/types';
import { WsProvider } from '@polkadot/api';
import { bufferToU8a, isBuffer, isU8a, u8aToHex } from '@polkadot/util';
import { createTestPairs } from '@polkadot/keyring';

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

  const { alice, alice_stash, bob, bob_stash } = createTestPairs();
  const pairs = [alice, alice_stash, bob, bob_stash];

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
