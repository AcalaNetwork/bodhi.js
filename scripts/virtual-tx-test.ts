import { TokenImplementation__factory, Bridge__factory, createNonce, coalesceChainId } from '@certusone/wormhole-sdk';
import { Keyring } from '@polkadot/api';
import { hexToU8a, nToU8a } from '@polkadot/util';
import '@polkadot/api-augment';
import { arrayify, keccak256, zeroPad } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { createApi, EvmRpcProvider } from '@acala-network/eth-providers';
import WebSocket from 'ws';
import { ACALA_TESTNET_NODE_RPC, ACALA_TESTNET_RPC, ACALA_TESTNET_RPC_WS, ACALA_TESTNET_RPC_WS_SAFE, rpcGet, sleep } from './utils';

const eq = (x: any, y: any): boolean => JSON.stringify(x) === JSON.stringify(y);

const expectEqual = ([x, y, z]: [any, any, any?], name = ''): void => {
  if (!eq(x, y) || (z && !eq(x, z))) throw new Error(`<${name}> not equal. get: ${JSON.stringify([x, y, z])}`);

  name && console.log(`${name} ok ✓ `)
};

const main = async () => {
  const rpc = process.env.RPC_URL || ACALA_TESTNET_RPC;
  const rpcWs = process.env.RPC_URL_WS || ACALA_TESTNET_RPC_WS;
  console.log({
    rpc,
    rpcWs,
  })

  const eth_blockNumber = rpcGet('eth_blockNumber', rpc);
  const eth_getBlockByNumber = rpcGet('eth_getBlockByNumber', rpc);
  const eth_getTransactionByHash = rpcGet('eth_getTransactionByHash', rpc);
  const eth_getTransactionReceipt = rpcGet('eth_getTransactionReceipt', rpc);
  const eth_getLogs = rpcGet('eth_getLogs', rpc);

  const _printCurrentBlock = async () => `block: ${Number((await eth_blockNumber()).data.result)}`;

  const myAddr = '0x14b941abbc71ebaae00abc0da71d43af55b25d07';
  const formatedToAddress = zeroPad(arrayify(myAddr), 32);
  const ACALA_TESTNET_BRIDGE_ADDR = '0xeba00cbe08992edd08ed7793e07ad6063c807004';
  const ACA_ADDRESS = '0x0000000000000000000100000000000000000000';

  const sudoKey = '';
  if (sudoKey === '') throw new Error('need to provide a sudo private key');

  const bridgeContract = Bridge__factory.connect(ACALA_TESTNET_BRIDGE_ADDR, new JsonRpcProvider(rpc));

  // const tokenContract = TokenImplementation__factory.connect(ACA_ADDRESS, provider);
  // const approveTx = await tokenContract.populateTransaction.approve(ACALA_TESTNET_BRIDGE_ADDR, '9999999999999999');

  const tx = await bridgeContract.populateTransaction.transferTokens(
    ACA_ADDRESS,
    BigNumber.from(String(0.01 * 10 ** 12)),
    coalesceChainId('karura'),
    formatedToAddress,
    0,
    createNonce()
  );

  // console.log(tx);

  const api = createApi(ACALA_TESTNET_NODE_RPC);
  await api.isReady;

  const keyring = new Keyring({ type: 'sr25519' });
  const sudoPair = keyring.addFromUri(sudoKey);

  const evmCall = api.tx.evm.call(tx.to, tx.data, 0, 1000000, 60000, []);
  const dispatchAs = api.tx.utility.dispatchAs(
    { system: { signed: '23xqWQqdAKf4xwuKcCmvR5sQb8EPDKFzSGGtxqZjwKwtgiWM' } },
    evmCall
  );

  const extrinsic = api.tx.sudo.sudo(api.tx.scheduler.scheduleAfter(0, null, 0, { value: dispatchAs }));
  const batch = api.tx.utility.batch([
    extrinsic,
    extrinsic,
  ])

  console.log('✈️  sending scheduled tx ...');
  console.log(await _printCurrentBlock());
  const start = performance.now();
  await new Promise<void>((resolve) => {
    batch.signAndSend(sudoPair, (result) => {
      if (result.isInBlock) {
        resolve();
      }
    });
  });
  const end = performance.now();
  const diff = end - start;

  console.log('👌 successfully scheduled evm call!');
  console.log(`⌛ time used: ${(diff / 1000).toFixed(2)}`);
  const curBlock = Number((await eth_blockNumber()).data.result);
  console.log(`block: ${curBlock}`);
  console.log('');
  const targetBlock = curBlock + 1;

  /* ---------- test subscription ---------- */
  const ws = new WebSocket(rpcWs);

  ws.on('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'eth_subscribe', params: ['logs', {}] }));
    console.log('👌 successfully subscribed to logs!');
  });

  ws.on('message', (data) => {
    console.log('===== subscription response =====');
    console.log(data.toString());
    console.log('=================================');
  });

  await sleep(20000);     // wait for the subscription msg

  /* ---------- eth_getBlockByNumber ---------- */
  console.log(`---------- eth_getBlockByNumber ----------`);
  let blockData = (await eth_getBlockByNumber([targetBlock, true])).data.result;
  while (!blockData) {
    await sleep(3000);
    blockData = (await eth_getBlockByNumber([targetBlock, true])).data.result;
  }
  console.log(blockData);
  const targetTx = blockData.transactions[0];
  const targetTx2 = blockData.transactions[1];
  const hash1 = targetTx.hash;
  const hash2 = targetTx2.hash;

  const expectedTxHash1 = keccak256([...hexToU8a(targetTx.blockHash), ...nToU8a(0)]);
  const expectedTxHash2 = keccak256([...hexToU8a(targetTx.blockHash), ...nToU8a(1)]);
  console.log(`⭐ expected virtual hash 1: ${expectedTxHash1}`);
  console.log(`⭐ expected virtual hash 2: ${expectedTxHash2}`);

  expectEqual([targetTx.from, targetTx2.from, '0x14b941abbc71ebaae00abc0da71d43af55b25d07'], 'blockData from');
  expectEqual([targetTx.to, targetTx2.to, '0xeba00cbe08992edd08ed7793e07ad6063c807004'], 'blockData to');
  expectEqual([hash1, expectedTxHash1], 'blockData txhash1');
  expectEqual([hash2, expectedTxHash2], 'blockData txhash2');
  expectEqual([targetTx.transactionIndex, '0x0'], 'blockData transactionIndex1');
  expectEqual([targetTx2.transactionIndex, '0x1'], 'blockData transactionIndex2');

  /* ---------- test getTxReceipt ---------- */
  console.log(`---------- eth_getTransactionReceipt ----------`);
  const receipt = (await eth_getTransactionReceipt([hash1])).data.result;
  const receipt2 = (await eth_getTransactionReceipt([hash2])).data.result;
  console.log(receipt);
  console.log(receipt2);
  expectEqual([receipt.from, receipt2.from, '0x14b941abbc71ebaae00abc0da71d43af55b25d07'], 'txReceipt from');
  expectEqual([receipt.to, receipt2.to, '0xeba00cbe08992edd08ed7793e07ad6063c807004'], 'txReceipt to');
  expectEqual([receipt.transactionHash, expectedTxHash1], 'txReceipt txhash');
  expectEqual([receipt2.transactionHash, expectedTxHash2], 'txReceipt txhash2');
  expectEqual([receipt.transactionIndex, '0x0'], 'receipt transactionIndex1');
  expectEqual([receipt2.transactionIndex, '0x1'], 'receipt transactionIndex2');

  /* ---------- test getTxByHash ---------- */
  console.log(`---------- eth_getTransactionByHash ----------`);
  const txData = (await eth_getTransactionByHash([hash1])).data.result;
  const txData2 = (await eth_getTransactionByHash([hash2])).data.result;
  console.log(txData);
  expectEqual([txData.from, txData2.from, '0x14b941abbc71ebaae00abc0da71d43af55b25d07'], 'txData from');
  expectEqual([txData.to, txData2.to, '0xeba00cbe08992edd08ed7793e07ad6063c807004'], 'txData to');
  expectEqual([txData.hash, expectedTxHash1], 'txData txhash');
  expectEqual([txData2.hash, expectedTxHash2], 'txData txhash');
  expectEqual([txData.transactionIndex, '0x0'], 'txData transactionIndex1');
  expectEqual([txData2.transactionIndex, '0x1'], 'txData transactionIndex2');


  /* ---------- test getLogs ---------- */
  console.log(`---------- getLogs ----------`);
  let logs = (await eth_getLogs([{ blockHash: targetTx.blockHash }])).data.result;
  while (!logs.length) {
    console.log('still waiting for subquery to index logs ...');
    await sleep(3000);
    logs = (await eth_getLogs([{ blockHash: targetTx.blockHash }])).data.result;
  }
  console.log(logs);
  expectEqual([logs.length, 6], 'has 6 logs');
  expectEqual([logs[0].address, logs[3].address, '0x0000000000000000000100000000000000000000'], 'log0, log3 address');
  expectEqual([logs[0].topics, logs[3].topics, [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x00000000000000000000000014b941abbc71ebaae00abc0da71d43af55b25d07',
    '0x000000000000000000000000eba00cbe08992edd08ed7793e07ad6063c807004',
  ]], 'log0, log3 topic');

  expectEqual([logs[1].address, logs[4].address, '0x0000000000000000000100000000000000000000'], 'log1, log5 address');
  expectEqual([logs[1].topics, logs[4].topics, [
    '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
    '0x00000000000000000000000014b941abbc71ebaae00abc0da71d43af55b25d07',
    '0x000000000000000000000000eba00cbe08992edd08ed7793e07ad6063c807004',
  ]], 'log1, log4 topic');

  expectEqual([logs[2].address, logs[5].address, '0x4377b49d559c0a9466477195c6adc3d433e265c0'], 'log2, log5 address');
  expectEqual([logs[2].topics, logs[5].topics, [
    '0x6eb224fb001ed210e379b335e35efe88672a8ce935d981a6896b27ffdf52a3b2',
    '0x000000000000000000000000eba00cbe08992edd08ed7793e07ad6063c807004'
  ]], 'log2, log5 topic');

  expectEqual([logs.map(l => l.transactionIndex), ['0x0', '0x0', '0x0', '0x1', '0x1', '0x1']], 'transactionIndex');

  console.log('all tests passed 🎉')

  await api.disconnect();
};

main().then(
  () => process.exit(0),
  (err) => {
    console.log(err);
    process.exit(1);
  }
);
