import { MANDALA_RPC, MANDALA_RPC_SUBQL, rpcGet } from './utils';
import { Wallet } from '@ethersproject/wallet';
import { JsonRpcProvider } from '@ethersproject/providers';

const printCurrentBlock = async () => `block: ${Number((await rpcGet('eth_blockNumber')()).data.result)}`;

const main = async () => {
  const gas = (await rpcGet('eth_getEthGas')()).data.result;
  const wallet = new Wallet(process.env.KEY, new JsonRpcProvider(MANDALA_RPC));
  const nonce = await wallet.getTransactionCount('pending');
  const tx = {
    chainId: 595,
    to: wallet.address,
    data: '0x',
    value: 0,
    ...gas,
    nonce
  };
  const rawTx = await wallet.signTransaction(tx);

  const startBlock = Number((await rpcGet('eth_blockNumber')()).data.result);
  const startTime = performance.now();

  console.log(`✈️  sending tx ... ${await printCurrentBlock()}`);
  const txHash = (await rpcGet('eth_sendRawTransaction')([rawTx])).data.result;
  console.log(`👌 tx sent to pool. ${await printCurrentBlock()}`);
  console.log(`-----------------------------------------------------------------`);

  await new Promise<void>((resolve) => {
    const i = setInterval(async () => {
      const curTime = performance.now();
      const timeUsed = (curTime - startTime) / 1000;
      console.log(`waiting for confirmation... ${await printCurrentBlock()} - ${timeUsed.toFixed(2)}s`);
      const receipt = (await rpcGet('eth_getTransactionReceipt')([txHash])).data.result;

      if (receipt) {
        clearInterval(i);
        const endBlock = Number((await rpcGet('eth_blockNumber')()).data.result);
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
