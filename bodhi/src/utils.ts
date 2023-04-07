/* eslint-disable prefer-promise-reject-errors */
import { SignerProvider } from '@acala-network/eth-providers';
import { BigNumber } from '@ethersproject/bignumber';
import { BytesLike } from '@ethersproject/bytes';
import { WsProvider } from '@polkadot/api';
import { createTestPairs } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import { bufferToU8a, isBuffer, isU8a, u8aToHex } from '@polkadot/util';
import { SubstrateSigner } from './SubstrateSigner';
import { Signer } from './Signer';

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
  wallets: Signer[];
  pairs: KeyringPair[];
  provider: SignerProvider;
}> => {
  const provider = new SignerProvider({
    provider: new WsProvider(url),
  });
  await provider.isReady();

  const { alice, alice_stash, bob, bob_stash } = createTestPairs();
  const pairs = [alice, alice_stash, bob, bob_stash];

  const wallets: Signer[] = [];
  for (const pair of pairs) {
    const signer = new SubstrateSigner(provider.api.registry, pair);
    const wallet = new Signer(provider, pair.address, signer);

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
