import WebSocket from 'ws';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { options } from '@acala-network/api';
import { runWithTiming, EvmRpcProvider } from '@acala-network/eth-providers';

const sleep = x => new Promise(r => setTimeout(r, x))

const endpoints = {};

const benchmark = async (name: string, endpoint: string) => {
  // const provider = new WsProvider(endpoint);
  // const api = new ApiPromise(options({ provider }));
  // await api.isReady;

  const evmProvider = new EvmRpcProvider(endpoint);
  await evmProvider.isReady();

  console.log('sleeping')
  await sleep(1500);
  console.log('ok')

  
  const { time, res } = await runWithTiming(() => evmProvider.getBlockData('latest'), 1);
  const { time: time2 } = await runWithTiming(() => evmProvider.getBlockData('latest'), 1);
  // console.log(res);
  // console.log('api ready');

  // const { time: getblockTime, res: res1 } = await runWithTiming(async () => await api.rpc.chain.getBlock());
  // const { time: getHeaderTime, res: res2 } = await runWithTiming(async () => await api.rpc.chain.getHeader());
  // const { time: validatorTime, res: res3 } = await runWithTiming(async () => await api.query.session.validators());
  // const { time: timestampTime, res: res4 } = await runWithTiming(async () => await api.query.timestamp.now());


  // await api.disconnect();
  return [time, time2];
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
