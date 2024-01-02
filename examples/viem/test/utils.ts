export const localChainConfig = {
  name: 'local',
  id: 595,
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
