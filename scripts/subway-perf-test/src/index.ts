import WebSocket from 'ws';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { options } from '@acala-network/api';
import { runWithTiming, EvmRpcProvider } from '@acala-network/eth-providers';

const sleep = x => new Promise(r => setTimeout(r, x));

const endpoints = {
  localSubway: 'ws://localhost:9955',
  acalaDwellir: 'wss://acala-rpc.dwellir.com',
  acala0: 'wss://acala-rpc-0.aca-api.network',
};

const benchmark = async (name: string, endpoint: string) => {
  // const provider = new WsProvider(endpoint);
  // const api = new ApiPromise(options({ provider }));
  // await api.isReady;

  const evmProvider = new EvmRpcProvider(endpoint);
  await evmProvider.isReady();

  const { time, res } = await runWithTiming(() => evmProvider.getBlockData('latest'), 1);
  const { time: time2, res: res2 } = await runWithTiming(() => evmProvider.getBlockData(res.number), 1);
  const { time: time3, res: res3 } = await runWithTiming(() => evmProvider.getBlockData(res.number), 1);
  const { time: time4, res: res4 } = await runWithTiming(() => evmProvider.getBlockData(res.number), 1);
  const { time: time5, res: res5 } = await runWithTiming(() => evmProvider.getBlockData(res.number), 1);

  if (JSON.stringify(res) !== JSON.stringify(res2)) {
    console.log(res, res2);
    throw new Error('result does not match!');
  }
  // console.log(res);
  // console.log('api ready');

  // await api.disconnect();

  await evmProvider.disconnect();
  return [time, time2, time3, time4, time5];
  // return {
  //   getblockTime,
  //   validatorTime,
  //   timestampTime,
  //   getHeaderTime,
  // };
};

const main = async () => {
  for (const [name, endpoint] of Object.entries(endpoints)) {
    const time = await benchmark(name, endpoint);
    console.log(name, time);
  }
};

// const ws = async () => {
//   const ws = new WebSocket(endpoint);
//   ws.on('open', () => {
//     console.log(`connected to [${endpoint}]`);

//     ws.on('message', data => {
//       const parsedData = JSON.parse(data.toString());
//       console.log(parsedData);
//     });

//     ws.send(JSON.stringify({
//       id: '0',
//       jsonrpc: '2.0',
//       method: 'rpc_methods',
//       params: [],
//     }));

//   });
// }

main();
