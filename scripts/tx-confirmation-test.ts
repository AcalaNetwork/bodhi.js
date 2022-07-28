import { ACALA_MAINNET_RPC, KARURA_MAINNET_RPC, MANDALA_RPC, MANDALA_RPC_SUBQL, rpcGet } from './utils';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';

const main = async () => {
  const rpc = process.env.RPC_URL || ACALA_MAINNET_RPC;
  const eth_getEthGas = rpcGet('eth_getEthGas', rpc);
  const eth_blockNumber = rpcGet('eth_blockNumber', rpc);
  const eth_sendRawTransaction = rpcGet('eth_sendRawTransaction', rpc);
  const eth_getTransactionReceipt = rpcGet('eth_getTransactionReceipt', rpc);
  const eth_chainId = rpcGet('eth_chainId', rpc);

  const _printCurrentBlock = async () => `block: ${Number((await eth_blockNumber()).data.result)}`;

  const wallet = new Wallet(process.env.KEY, new JsonRpcProvider(rpc));

  const [gasRes, chainIdRes, nonce] = await Promise.all([
    eth_getEthGas(),
    eth_chainId(),
    wallet.getTransactionCount('pending')
  ]);

  const chainId = Number(chainIdRes.data.result);
  const gas = gasRes.data.result;

  const tx = {
    to: wallet.address,
    data: '0x',
    value: 0,
    chainId,
    nonce,
    ...gas
  };
  const rawTx = await wallet.signTransaction(tx);

  const startBlock = Number((await eth_blockNumber()).data.result);
  const startTime = performance.now();

  console.log(`✈️  sending tx ... ${await _printCurrentBlock()}`);
  const res = await eth_sendRawTransaction([rawTx]);
  const txHash = res.data?.result;
  if (!txHash) {
    console.log(res);
    throw new Error(`tx sending failed!`);
  }

  console.log(`👌 tx sent to pool. ${await _printCurrentBlock()}`);
  console.log(`-----------------------------------------------------------------`);

  await new Promise<void>((resolve) => {
    const i = setInterval(async () => {
      const curTime = performance.now();
      const timeUsed = (curTime - startTime) / 1000;
      console.log(`waiting for confirmation... ${await _printCurrentBlock()} - ${timeUsed.toFixed(2)}s`);
      const receipt = (await eth_getTransactionReceipt([txHash])).data.result;

      if (receipt) {
        clearInterval(i);
        const endBlock = Number((await eth_blockNumber()).data.result);
        const endTime = performance.now();
        const diff = endTime - startTime;
        console.log(`
  ------------------------------------
    🎉 tx confirmed!
    🧱 blocks waited: ${endBlock - startBlock} blocks
    ⌛ time used: ${(diff / 1000).toFixed(2)} seconds
  ------------------------------------
        `);
        resolve();
      }
    }, 1000);
  });
};

main().then(
  () => process.exit(0),
  (e) => {
    console.log(e);
    process.exit(1);
  }
);
