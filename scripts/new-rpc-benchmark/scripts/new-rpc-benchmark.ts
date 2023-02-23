import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import axios from 'axios';

type EthGas = {
  gasPrice: BigNumber;
  gasLimit: BigNumber;
};

const one = ethers.utils.parseEther('1');

const rpcGet =
  (method: string, url: string) =>
    (params: any[] = []): any =>
      axios.get(url, {
        data: {
          id: 0,
          jsonrpc: '2.0',
          method,
          params,
        },
      });

const eth_getBlockByNumber_new = rpcGet('eth_getBlockByNumber', 'http://localhost:8545');
const eth_getBlockByNumber_old = rpcGet('eth_getBlockByNumber', 'http://localhost:8546');
const eth_getTransactionReceipt_new = rpcGet('eth_getTransactionReceipt', 'http://localhost:8545');
const eth_getTransactionReceipt_old = rpcGet('eth_getTransactionReceipt', 'http://localhost:8546');

const main = async () => {
  const allUsers = await ethers.getSigners();
  const allAddrs = await Promise.all(allUsers.map(user => user.getAddress()));
  const deployerAddress = allAddrs[0];
  console.log(`address count: ${allAddrs.length}`);

  console.log('⛏️  deploying token contract');
  const Token = await ethers.getContractFactory('Token');
  const initSupply = one.mul(123456789000);
  const gas = (await ethers.provider.send('eth_getEthGas', [])) as EthGas;
  const token = await Token.deploy(initSupply, gas);
  const receipt = await token.deployTransaction.wait();
  console.log(`✅ token deployed at block ${receipt.blockNumber}`);
  console.log('');

  const transferAmount = one.mul(3);

  let nextUserIdx = 0;
  const getBlockTimeOld = [];
  const getBlockTimeNew = [];
  const getReceiptTimeOld = [];
  const getReceiptTimeNew = [];
  for (let txCount = 10; txCount <= 310; txCount += 20) {
    let nonce = (await ethers.provider.send('eth_getTransactionCount', [deployerAddress, 'latest']));
    const curBlock = (await ethers.provider.send('eth_blockNumber', []));
    console.log(`⛏️  sending ${txCount} txs at block ${Number(curBlock)}`);

    const txs = [];
    for (let i = 0; i < txCount; i++) {
      txs.push(token.transfer(allAddrs[nextUserIdx], transferAmount, { nonce: nonce++ }));
      nextUserIdx = nextUserIdx++ % allAddrs.length;
    }

    const txResponses = await Promise.all(txs);
    const receipts = await Promise.all(txResponses.map(r => r.wait()));
    const blockNum = receipts[0].blockNumber;
    const txHash = receipts[0].transactionHash;

    console.log(`✅ mined ${txCount} txs at block ${blockNum}`);

    let start = Date.now();
    await eth_getBlockByNumber_new([blockNum, true]);
    const newBlockTime = Date.now() - start;
    getBlockTimeNew.push(newBlockTime);
    
    start = Date.now();
    await eth_getBlockByNumber_old([blockNum, true]);
    const oldBlockTime = Date.now() - start;
    getBlockTimeOld.push(oldBlockTime);

    start = Date.now();
    await eth_getTransactionReceipt_new([txHash]);
    const newReceiptTime = Date.now() - start;
    getReceiptTimeNew.push(newReceiptTime);

    start = Date.now();
    await eth_getTransactionReceipt_old([txHash]);
    const oldReceiptTime = Date.now() - start;
    getReceiptTimeOld.push(oldReceiptTime);

    console.log(`🕑 [  getBlock  ] old: ${oldBlockTime}ms | new: ${newBlockTime}ms => ${(oldBlockTime / newBlockTime).toFixed(2)}X faster 🚀`);
    console.log(`🕑 [ getReceipt ] old: ${oldReceiptTime}ms | new: ${newReceiptTime}ms => ${(oldReceiptTime / newReceiptTime).toFixed(2)}X faster 🚀`);
    console.log('');
  }

  console.log(getBlockTimeOld);
  console.log(getBlockTimeNew);
  console.log(getReceiptTimeOld);
  console.log(getReceiptTimeNew);
};

main();
