import { runWithTiming, EvmRpcProvider } from '@acala-network/eth-providers';

const endpoints = {
  localSubway: 'ws://localhost:9955',
  acalaDwellir: 'wss://acala-rpc.n.dwellir.com',
  acala0: 'wss://acala-rpc-0.aca-api.network',
};

const benchmark = async (name: string, endpoint: string) => {
  const evmProvider = new EvmRpcProvider(endpoint);
  await evmProvider.isReady();

  const { time, res } = await runWithTiming(() => evmProvider.getBlockData('latest'), 1);
  const { time: time2, res: res2 } = await runWithTiming(() => evmProvider.getBlockData(res.number), 1);
  const { time: time3, res: res3 } = await runWithTiming(() => evmProvider.getBlockData(res.number), 1);
  const { time: time4, res: res4 } = await runWithTiming(() => evmProvider.getBlockData(res.number), 1);
  const { time: time5, res: res5 } = await runWithTiming(() => evmProvider.getBlockData(res.number), 1);

  if (
    JSON.stringify(res) !== JSON.stringify(res2) ||
    JSON.stringify(res2) !== JSON.stringify(res3) ||
    JSON.stringify(res3) !== JSON.stringify(res4) ||
    JSON.stringify(res4) !== JSON.stringify(res5)
  ) {
    throw new Error('result does not match!');
  }

  await evmProvider.disconnect();
  return [time, time2, time3, time4, time5];
};

const main = async () => {
  for (const [name, endpoint] of Object.entries(endpoints)) {
    const time = await benchmark(name, endpoint);
    console.log(name, time);
  }
};

main();
