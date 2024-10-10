import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Wallet } from 'ethers';

import { ETH_RPC_URL, NODE_URL } from './consts';
import { evmAccounts } from './evm-accounts';

const provider = new AcalaJsonRpcProvider(ETH_RPC_URL);
const wallets = evmAccounts.map(account => new Wallet(account.privateKey, provider));

export const createApi = () => ApiPromise.create({
  provider: new WsProvider(NODE_URL),
});

export const testSetup = {
  provider,
  wallets,
  wallet: wallets[0],
};
