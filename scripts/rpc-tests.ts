import WebSocket from 'ws';
import {
  rpcGet,
  MANDALA_RPC,
  runWithTiming,
  sleep,
  KARURA_MAINNET_RPC,
  ACALA_MAINNET_RPC,
  KARURA_BETA_RPC,
  ACALA_BETA_RPC
} from './utils';

const chains = {
  Mandala: 'Mandala',
  Karura: 'Karura',
  KaruraBeta: 'KaruraBeta',
  Acala: 'Acala',
  AcalaBeta: 'AcalaBeta'
};

const ethRpc = {
  Mandala: MANDALA_RPC,
  Karura: KARURA_MAINNET_RPC,
  KaruraBeta: KARURA_BETA_RPC,
  Acala: ACALA_MAINNET_RPC,
  AcalaBeta: ACALA_BETA_RPC
};

if (!process.env.CHAIN) {
  console.log(`no CHAIN provided, defaulting to mandala`);
}

const CHAIN = process.env.CHAIN ?? chains.Mandala;
if (!Object.keys(chains).includes(CHAIN)) {
  throw new Error(`invalid chain name: ${CHAIN}`);
}

// default to mandala
let endpoint = ethRpc[chains.Mandala];
let txHash = '0x95ce3cce2f67820ceb601e96369f102cad85df88a5220fd24fff7317d62afcb2';
let address = '0x75E480dB528101a381Ce68544611C169Ad7EB342';
let contractAddress = '0x08d0CE84907213d2ed2511E8009bE01eA63F8a5C';
let blockNumber = 1001066;

if (CHAIN === chains.Karura || CHAIN === chains.KaruraBeta) {
  endpoint = ethRpc[CHAIN];
  txHash = '0x0710b561f3e8187de540ec4fcd404a6bed9c488db621c9c7ff4211871320ceb0';
  address = '0x84d628Bf8AEE96A40D551b3D0Dd3cf6D56695627';
  contractAddress = '0x1F3a10587A20114EA25Ba1b388EE2dD4A337ce27';
  blockNumber = 2620870;
} else if (CHAIN === chains.Acala || chains.AcalaBeta) {
  endpoint = ethRpc[CHAIN];
  txHash = '0x66853c38fad1231cdd566a68ed5d8dc0ffaa77d3f0b86ee217738a05c9cfd23d';
  address = '0xfFFfd2fF9b840F6bd74f80DF8E532b4D7886FFFf';
  contractAddress = '0x07DF96D1341A7d16Ba1AD431E2c847d978BC2bCe';
  blockNumber = 1834925;
}

const endpointWs = endpoint.replace('https', 'wss');

console.log('starting tests with: ', {
  chain: CHAIN,
  endpoint: endpoint,
  ws: endpointWs
});

const query = async (method: string, params: any = []): Promise<void> => {
  console.log(`============= ${method} =============`);
  const res = await runWithTiming(async () => (await rpcGet(method, endpoint)(params)).data.result);

  console.log(res);
  console.log('');
};

const queryBasic = async () => {
  await query('web3_clientVersion');
  await query('net_version');
  await query('eth_chainId');
  await query('eth_blockNumber');
  await query('net_runtimeVersion');
  await query('net_isSafeMode');
  await query('eth_gasPrice');
  await query('eth_getEthGas');
  await query('eth_getTransactionCount', [address, 'latest']);
  await query('eth_getTransactionCount', [address, 'finalized']);
  await query('net_health');
  // await query('net_cacheInfo');
  await query('net_indexer');
};

const querySubquery = async () => {
  await query('eth_getTransactionReceipt', [txHash]);
  await query('eth_getBlockByNumber', [blockNumber, true]);
  await query('eth_getLogs', [
    {
      fromBlock: 1000000,
      address: contractAddress,
      topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      ]
    }
  ]);

  // TODO: orphan logs
};

const queryWs = async () => {
  const ws = new WebSocket(endpointWs);

  ws.on('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'eth_subscribe', params: ['newHeads'] }));
  });

  ws.on('message', (data) => {
    console.log(data.toString());
  });

  await sleep(30000);
};

const run = async () => {
  await queryBasic();
  await querySubquery();
  await queryWs();
};

run().then(
  () => process.exit(0),
  (e) => {
    console.log(e);
    process.exit(1);
  }
);
