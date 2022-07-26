import WebSocket from 'ws';
import {
  rpcGet,
  MANDALA_RPC,
  MANDALA_RPC_SUBQL,
  runWithTiming,
  sleep,
  MANDALA_RPC_WS,
  MANDALA_RPC_WS_SUBQL,
  rpcGetBatch,
  MANDALA_RPC_SUBQL_OLD
} from './utils';

const queryBothRpc = async (method: string, params: any = []): Promise<void> => {
  console.log(`===== ${method} =====`);
  const [res1, res2] = await Promise.all([
    runWithTiming(async () => (await rpcGet(method, MANDALA_RPC)(params)).data.result),
    runWithTiming(async () => (await rpcGet(method, MANDALA_RPC_SUBQL)(params)).data.result)
  ]);

  if (process.env.TIME_ONLY) {
    console.log(res1.time, res2.time);
  } else {
    console.log(res1, res2);
  }
  console.log('--------------------------------------------');
  console.log('');
};

const queryBothRpcBatch = async (data: any): Promise<void> => {
  console.log(`===== batch calls =====`);
  const [res1, res2] = await Promise.all([
    runWithTiming(async () => (await rpcGetBatch(data, MANDALA_RPC)).data),
    runWithTiming(async () => (await rpcGetBatch(data, MANDALA_RPC_SUBQL)).data)
  ]);

  if (process.env.TIME_ONLY) {
    console.log(res1.time, res2.time);
  } else {
    console.log(res1, res2);
  }
  console.log('--------------------------------------------');
  console.log('');
};

const run = async () => {
  /* --------------- direct queries --------------- */
  await queryBothRpc('web3_clientVersion');
  await queryBothRpc('net_version');
  await queryBothRpc('eth_chainId');
  await queryBothRpc('eth_blockNumber');
  await queryBothRpc('net_runtimeVersion');
  await queryBothRpc('net_health');
  await queryBothRpc('net_isSafeMode');
  await queryBothRpc('net_cacheInfo');
  await queryBothRpc('net_indexer');
  await queryBothRpc('eth_gasPrice');
  await queryBothRpc('eth_getEthGas');
  await queryBothRpc('eth_getTransactionCount', ['0x75E480dB528101a381Ce68544611C169Ad7EB342', 'latest']);

  /* --------------- batch queries --------------- */
  await queryBothRpcBatch([
    {
      id: 0,
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: []
    },
    {
      id: 0,
      jsonrpc: '2.0',
      method: 'eth_gasPrice',
      params: []
    },
    {
      id: 0,
      jsonrpc: '2.0',
      method: 'eth_getEthGas',
      params: []
    }
  ]);

  /* --------------- subquery --------------- */
  await queryBothRpc('eth_getTransactionReceipt', [
    '0x95ce3cce2f67820ceb601e96369f102cad85df88a5220fd24fff7317d62afcb2'
  ]);
  await queryBothRpc('eth_getLogs', [
    {
      blockHash: '0x040af8e12c462dc0e45b87fc7609e60ff37304c68b9d3d52c137db34d1d38457',
      address: '0xCe0C18D5879D8d58A23Ff2347A4a968Dc30996BC',
      topics: ['0xb71d0f298f822317eb6032202ce97a303704034e9c3ae9b9393dcc542dc1e8cc']
    }
  ]);
  await queryBothRpc('eth_getLogs', [
    {
      fromBlock: 1,
      address: '0xCe0C18D5879D8d58A23Ff2347A4a968Dc30996BC'
    }
  ]);

  /* --------------- subscribe --------------- */
  const ws = new WebSocket(MANDALA_RPC_WS_SUBQL);

  ws.on('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'eth_subscribe', params: ['newHeads'] }));
  });

  ws.on('message', (data) => {
    console.log(data.toString());
  });

  await sleep(30000);
};

run().then(
  () => process.exit(0),
  (e) => {
    console.log(e);
    process.exit(1);
  }
);
