import { ApiPromise, WsProvider } from '@polkadot/api';
import { options } from '@acala-network/api';
import TokenABI from '@acala-network/contracts/build/contracts/Token.json';

const main = async () => {
  // const provider = new WsProvider('wss://karura-testnet.aca-staging.network/rpc/karura/ws');
  const provider = new WsProvider('wss://karura-rpc-0.aca-api.network');
  const api = new ApiPromise(options({ provider }));
  await api.isReady;

  const tokenAddr = '0xe5ba1e8e6bbbdc8bbc72a58d68e74b13fcd6e4c7';
  const transferAmount = 1000;
  const dest = {
    V3: {
      parents: 1,
      interior: {
        X2: [
          { parachain: 2090 },
          { accountId32: { id: 'rPWzRkpPjuceq6Po91sfHLZJ9wo6wzx4PAdjUH91ckv81nv', network: 'Any' } },
        ],
      },
    },
  };

  console.log(api.tx.xtokens) 
  const tx = api.tx.xTokens.transfer({ Erc20: tokenAddr }, transferAmount, dest, '0x00');
  console.log(tx.toHex())
};

main();
