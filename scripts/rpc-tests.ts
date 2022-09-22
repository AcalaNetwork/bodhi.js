import WebSocket from 'ws';
import {
  rpcGet,
  MANDALA_RPC,
  MANDALA_RPC_SUBQL,
  runWithTiming,
  sleep,
  MANDALA_RPC_WS,
  MANDALA_RPC_WS_SUBQL
} from './utils';

if (!process.env.ENDPOINT) {
  console.log(`no ENDPOINT provided, defaulting to ${MANDALA_RPC}`);
}
if (!process.env.CHAIN) {
  console.log(`no CHAIN provided, defaulting to mandala`);
}
const ENDPOINT = process.env.ENDPOINT ?? MANDALA_RPC;
const CHAIN = process.env.CHAIN ?? 'mandala';

// default to mandala
let txHash = '0x95ce3cce2f67820ceb601e96369f102cad85df88a5220fd24fff7317d62afcb2';
let address = '0x75E480dB528101a381Ce68544611C169Ad7EB342';
let contractAddress = '0x08d0CE84907213d2ed2511E8009bE01eA63F8a5C';
let blockNumber = 1001066;

if (CHAIN === 'karura') {
  txHash = '0x0710b561f3e8187de540ec4fcd404a6bed9c488db621c9c7ff4211871320ceb0';
  address = '0x84d628Bf8AEE96A40D551b3D0Dd3cf6D56695627';
  contractAddress = '0x1F3a10587A20114EA25Ba1b388EE2dD4A337ce27';
  blockNumber = 2620870;
} else if (CHAIN === 'acala') {
  txHash = '0x66853c38fad1231cdd566a68ed5d8dc0ffaa77d3f0b86ee217738a05c9cfd23d';
  address = '0xfFFfd2fF9b840F6bd74f80DF8E532b4D7886FFFf';
  contractAddress = '0x07DF96D1341A7d16Ba1AD431E2c847d978BC2bCe';
  blockNumber = 1834925;
}

const query = async (method: string, params: any = []): Promise<void> => {
  console.log(`============= ${method} =============`);
  const res = await runWithTiming(async () => (await rpcGet(method, ENDPOINT)(params)).data.result);

  console.log(res);
  console.log('');
};

const queryBasic = async () => {
  await query('web3_clientVersion');
  await query('web3_clientVersion');
  await query('web3_clientVersion');
  await query('web3_clientVersion');
  await query('web3_clientVersion');
  await query('web3_clientVersion');
  await query('web3_clientVersion');
  await query('web3_clientVersion');
  await query('net_version');
  await query('eth_chainId');
  await query('eth_blockNumber');
  await query('net_runtimeVersion');
  await query('net_isSafeMode');
  await query('eth_gasPrice');
  await query('eth_getEthGas');
  await query('eth_getTransactionCount', [address, 'latest']);
  await query('net_health');
  await query('net_cacheInfo');
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
  const ws = new WebSocket(MANDALA_RPC_WS_SUBQL);

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
