import { acala, karura, mandala } from 'viem/chains';
import { createWalletClient, http, publicActions } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';

export const acalaForkConfig = {
  name: 'acala fork',
  id: 787,
  nativeCurrency: {
    name: 'acala',
    symbol: 'ACA',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
  network: 'local',
};

const TEST_MNEMONIC = 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm';
const account = mnemonicToAccount(TEST_MNEMONIC);

const targetChain = process.env.CHAIN ?? 'acalaFork';
const chainConfig = ({
  acalaFork: acalaForkConfig,
  mandala,
  karura,
  acala,
})[targetChain];

if (!chainConfig) {
  throw new Error('Invalid CHAIN env variable. Must be one { local, mandala, karura, acala }');
}

console.log(`creating client for ${chainConfig.name}`);
export const client = createWalletClient({
  account,
  chain: chainConfig,
  transport: http(),
}).extend(publicActions);
