import { TokenImplementation__factory, Bridge__factory, createNonce, coalesceChainId } from '@certusone/wormhole-sdk';
import { Keyring } from '@polkadot/api';
import { hexToU8a, nToU8a } from '@polkadot/util';
import '@polkadot/api-augment';
import { arrayify, keccak256, zeroPad } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { createApi, EvmRpcProvider } from '@acala-network/eth-providers';
import WebSocket from 'ws';
import { ACALA_TESTNET_NODE_RPC, ACALA_TESTNET_RPC, ACALA_TESTNET_RPC_WS_SAFE, rpcGet, sleep } from './utils';

const expectEqual = (x, y, name = ''): void => {
  if (x !== y) throw new Error(`<${name}>not equal. get: ${x}, expected: ${y}`);
  // name && console.log(`✓ ${name}`)
};

const main = async () => {
  const rpc = process.env.RPC_URL || ACALA_TESTNET_RPC;
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

  const extrinsic = await api.tx.sudo.sudo(api.tx.scheduler.scheduleAfter(0, null, 0, { value: dispatchAs }));

  console.log('✈️  sending tx ...');
  console.log(await _printCurrentBlock());
  console.log('');
  const start = performance.now();
  await new Promise<void>((resolve) => {
    extrinsic.signAndSend(sudoPair, (result) => {
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
  const targetBlock = curBlock + 1;

  /* ---------- test subscription ---------- */
  const ws = new WebSocket(ACALA_TESTNET_RPC_WS_SAFE);

  ws.on('open', () => {
    ws.send(JSON.stringify({ id: 1, method: 'eth_subscribe', params: ['logs', {}] }));
    console.log('👌 successfully subscribed to logs!');
  });

  ws.on('message', (data) => {
    console.log('===== subscription =====');
    console.log(data.toString());
    console.log('');
  });

  /* ---------- eth_getBlockByNumber ---------- */
  console.log(`---------- eth_getBlockByNumber ----------`);
  let blockData = (await eth_getBlockByNumber([targetBlock, true])).data.result;
  while (!blockData) {
    await sleep(3000);
    blockData = (await eth_getBlockByNumber([targetBlock, true])).data.result;
  }
  console.log(blockData);
  const targetTx = blockData.transactions[0];
  console.log(`⭐ expected virtual hash: ${keccak256([...hexToU8a(targetTx.blockHash), ...nToU8a(0)])}`);
  expectEqual(targetTx.from, '0x14b941abbc71ebaae00abc0da71d43af55b25d07', 'from');
  expectEqual(targetTx.to, '0xeba00cbe08992edd08ed7793e07ad6063c807004', 'to');
  expectEqual(targetTx.hash, keccak256([...hexToU8a(targetTx.blockHash), ...nToU8a(0)]), 'txhash');

  /* ---------- test getTxReceipt ---------- */
  console.log(`---------- eth_getTransactionReceipt ----------`);
  const receipt = (await eth_getTransactionReceipt([targetTx.hash])).data.result;
  console.log(receipt);
  expectEqual(receipt.from, '0x14b941abbc71ebaae00abc0da71d43af55b25d07', 'from');
  expectEqual(receipt.to, '0xeba00cbe08992edd08ed7793e07ad6063c807004', 'to');
  expectEqual(receipt.transactionHash, keccak256([...hexToU8a(targetTx.blockHash), ...nToU8a(0)]), 'txhash');

  /* ---------- test getTxByHash ---------- */
  console.log(`---------- eth_getTransactionByHash ----------`);
  const txData = (await eth_getTransactionByHash([targetTx.hash])).data.result;
  console.log(txData);
  expectEqual(txData.from, '0x14b941abbc71ebaae00abc0da71d43af55b25d07', 'from');
  expectEqual(txData.to, '0xeba00cbe08992edd08ed7793e07ad6063c807004', 'to');
  expectEqual(txData.hash, keccak256([...hexToU8a(targetTx.blockHash), ...nToU8a(0)]), 'txhash');

  /* ---------- test getLogs ---------- */
  console.log(`---------- getLogs ----------`);
  let logs = (await eth_getLogs([{ blockHash: targetTx.blockHash }])).data.result;
  while (!logs.length) {
    console.log('still waiting for subquery to index logs ...');
    await sleep(3000);
    logs = (await eth_getLogs([{ blockHash: targetTx.blockHash }])).data.result;
  }
  console.log(logs);
  expectEqual(logs.length, 3, 'has 3 logs');
  expectEqual(logs[0].address, '0x0000000000000000000100000000000000000000', 'log0 address');
  expectEqual(logs[0].topics[0], '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', 'log0 topic');
  expectEqual(logs[0].topics[1], '0x00000000000000000000000014b941abbc71ebaae00abc0da71d43af55b25d07', 'log0 topic');
  expectEqual(logs[0].topics[2], '0x000000000000000000000000eba00cbe08992edd08ed7793e07ad6063c807004', 'log0 topic');

  expectEqual(logs[1].address, '0x0000000000000000000100000000000000000000', 'log1 address');
  expectEqual(logs[1].topics[0], '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925', 'log1 topic');
  expectEqual(logs[1].topics[1], '0x00000000000000000000000014b941abbc71ebaae00abc0da71d43af55b25d07', 'log1 topic');
  expectEqual(logs[1].topics[2], '0x000000000000000000000000eba00cbe08992edd08ed7793e07ad6063c807004', 'log1 topic');

  expectEqual(logs[2].address, '0x4377b49d559c0a9466477195c6adc3d433e265c0', 'log2 address');
  expectEqual(logs[2].topics[0], '0x6eb224fb001ed210e379b335e35efe88672a8ce935d981a6896b27ffdf52a3b2', 'log2 topic');
  expectEqual(logs[2].topics[1], '0x000000000000000000000000eba00cbe08992edd08ed7793e07ad6063c807004', 'log2 topic');

  await api.disconnect();

  await sleep(100000);
};

main().then(
  () => process.exit(0),
  (err) => {
    console.log(err);
    process.exit(1);
  }
);
