/* eslint-disable sort-imports-es6-autofix/sort-imports-es6 */

import {
  AcalaEvmTXPayload,
  UnsignedAcalaEvmTX,
  parseTransaction,
  serializeTransaction,
  signTransaction,
} from '@acala-network/eth-transactions';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { AcalaJsonRpcProvider, EvmRpcProvider, ONE_HUNDRED_GWEI, nativeToEthDecimal, sleep } from '@acala-network/eth-providers';
import { Interface, formatEther,  parseEther, parseUnits } from 'ethers/lib/utils';
import { SubqlProvider } from '@acala-network/eth-providers/utils/subqlProvider';
import { Wallet } from '@ethersproject/wallet';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import DEXABI from '@acala-network/contracts/build/contracts/DEX.json';
import TokenABI from '@acala-network/contracts/build/contracts/Token.json';
import WebSocket from 'ws';

import {
  deployErc20,
  KARURA_ETH_RPC_URL,
  NODE_RPC_URL,
  SUBQL_URL,
  WS_URL,
  bigIntDiff,

  /* ---------- local rpc methods ---------- */
  eth_call,
  eth_blockNumber,
  eth_getBlockByNumber,
  eth_getTransactionReceipt,
  eth_getLogs,
  eth_getTransactionByHash,
  eth_accounts,
  eth_sendRawTransaction,
  eth_getTransactionCount,
  eth_getBalance,
  eth_chainId,
  eth_getEthGas,
  eth_getCode,
  net_runtimeVersion,
  eth_isBlockFinalized,
  eth_newFilter,
  eth_newBlockFilter,
  eth_getFilterChanges,
  eth_getFilterLogs,
  eth_uninstallFilter,

  /* ---------- karura mainnet rpc methods ---------- */
  eth_blockNumber_karura,
  eth_getTransactionReceipt_karura,
  eth_getTransactionByHash_karura,
  eth_getBlockByNumber_karura,
  eth_getStorageAt_karura,
  expectLogsEqual,
  hexilifyLog,
  estimateGas,
  getCurBlockHash,
  getNonce,
  RPC_URL,
  net_listening,
  deployGasMonster,
  toDeterministic,
  waitForHeight,
  eth_estimateGas,

  ADDRESS_ALICE,
  DETERMINISTIC_SETUP_DEX_ADDRESS,
  GAS_MONSTER_GAS_REQUIRED,
  KARURA_CONTRACT_CALL_TX_HASH,
  KARURA_CONTRACT_DEPLOY_TX_HASH,
  KARURA_SEND_KAR_TX_HASH,
  LogHexified,
  allLogs,
  deployHelloWorldData,
  evmAccounts,
  log22_0,
  log22_1 } from '../utils';


const subql = new SubqlProvider(SUBQL_URL);

const account1 = evmAccounts[0];
const account2 = evmAccounts[1];
const wallet1 = new Wallet(account1.privateKey);

describe('endpoint', () => {
  // some tests depend on the local deterministic setup or karura mainnet node connection
  beforeAll(async () => {
    if (process.env.SKIP_CHECK) return;

    try {
      const blockNum = (await eth_blockNumber()).data.result;

      const DETERMINISTIC_SETUP_TOTAL_BLOCKS = 22;
      if (Number(blockNum) !== DETERMINISTIC_SETUP_TOTAL_BLOCKS) {
        throw new Error(
          `test env setup failed! expected ${DETERMINISTIC_SETUP_TOTAL_BLOCKS} blocks but got ${Number(blockNum)}`
        );
      }

      const DETERMINISTIC_SETUP_TOTAL_TXS = 12;
      const DETERMINISTIC_SETUP_TOTAL_LOGS = 13;
      let tries = 0;
      let [allTxReceipts, allLogs] = await Promise.all([
        subql.getAllTxReceipts(),
        subql.getAllLogs(),
      ]);
      while (
        tries++ < 5 &&
        (
          allTxReceipts.length < DETERMINISTIC_SETUP_TOTAL_TXS ||
          allLogs.length < DETERMINISTIC_SETUP_TOTAL_LOGS
        )
      ) {
        console.log(`let's give subql a little bit more time to index, retrying #${tries} in 3s ...`);
        await sleep(3000);

        [allTxReceipts, allLogs] = await Promise.all([
          subql.getAllTxReceipts(),
          subql.getAllLogs(),
        ]);
      }

      if (
        allTxReceipts.length < DETERMINISTIC_SETUP_TOTAL_TXS ||
        allLogs.length < DETERMINISTIC_SETUP_TOTAL_LOGS
      ) {
        throw new Error(`
          test env setup failed!
          expected ${DETERMINISTIC_SETUP_TOTAL_TXS} Txs in subql but got ${allTxReceipts.length}
          expected ${DETERMINISTIC_SETUP_TOTAL_LOGS} logs in subql but got ${allLogs.length}
        `);
      }

      if (!process.env.SKIP_PUBLIC) {
        const blockNumKarura = (await eth_blockNumber_karura()).data.result;
        if (!(Number(blockNumKarura) > 1000000)) {
          throw new Error(`test env setup failed! There might be some connection issue with ${KARURA_ETH_RPC_URL}`);
        }
      }
    } catch (e) {
      console.log(
        `
        ------------------------
        test env setup failed ❌
        ------------------------
      `,
        e
      );
      throw e;
    }

    console.log(`
      --------------------------
      test env setup finished ✅
      --------------------------
    `);
  });

  // this should go first since it depends on the deterministic setup
  // TODO: refactor tests to seperate self-dependent tests
  describe('eth_getLogs', () => {
    const ALL_BLOCK_RANGE_FILTER = { fromBlock: 'earliest' };

    describe.concurrent('when no filter', () => {
      it('returns all logs from latest block', async () => {
        const res = (await eth_getLogs([{}])).data.result;
        expect(res.length).to.equal(2);
        expect(res[0]).to.deep.contain(log22_0);
        expect(res[1]).to.deep.contain(log22_1);
      });
    });

    describe.concurrent('filter by address', () => {
      it('returns correct logs', async () => {
        /* ---------- single address ---------- */
        for (const log of allLogs) {
          const res = await eth_getLogs([{ address: log.address, ...ALL_BLOCK_RANGE_FILTER }]);
          const expectedLogs = allLogs.filter(l => l.address === log.address);
          expectLogsEqual(res.data.result, expectedLogs);
        }

        // should support different case and array of addresses
        for (const log of allLogs) {
          const res = await eth_getLogs([
            { address: [log.address.toLocaleUpperCase(), '0x13579'], ...ALL_BLOCK_RANGE_FILTER },
          ]);
          const expectedLogs = allLogs.filter(l => l.address === log.address);
          expectLogsEqual(res.data.result, expectedLogs);
        }
      });
    });

    describe.concurrent('filter by block number', () => {
      it('returns correct logs', async () => {
        const BIG_NUMBER = 88888888;
        const BIG_NUMBER_HEX = '0x54C5638';

        let res: Awaited<ReturnType<typeof eth_getLogs>>;
        let expectedLogs: LogHexified[];

        /* ---------- should return all logs ---------- */
        res = await eth_getLogs([{ ...ALL_BLOCK_RANGE_FILTER }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ fromBlock: 0 }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ fromBlock: -100000, toBlock: BIG_NUMBER }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ fromBlock: -100000, toBlock: BIG_NUMBER_HEX }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ fromBlock: 0, toBlock: 'latest' }]);
        expectLogsEqual(res.data.result, allLogs);

        /* ---------- should return no logs ---------- */
        res = await eth_getLogs([{ fromBlock: 99999 }]);
        expect(res.data.result).to.deep.equal([]);

        res = await eth_getLogs([{ toBlock: -1 }]);
        expect(res.data.result).to.deep.equal([]);

        /* ---------- should return partial logs ---------- */
        const from = 9;
        const to = 11;
        res = await eth_getLogs([{ fromBlock: from }]);
        expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= from);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
        expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) <= to);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
        expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= from && parseInt(l.blockNumber) <= to);
        expectLogsEqual(res.data.result, expectedLogs);
      });
    });

    describe.concurrent('filter by block tag', () => {
      it('returns correct logs for valid tag', async () => {
        let res: Awaited<ReturnType<typeof eth_getLogs>>;
        let expectedLogs: LogHexified[];

        /* ---------- should return all logs ---------- */
        res = await eth_getLogs([{ fromBlock: 'earliest' }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ fromBlock: 0 }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ fromBlock: '0x0' }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ fromBlock: '0x00000000' }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: 'latest' }]);
        expectLogsEqual(res.data.result, allLogs);

        /* ---------- should return no logs ---------- */
        res = await eth_getLogs([{ fromBlock: 'latest', toBlock: 'earliest' }]);
        expect(res.data.result).to.deep.equal([]);

        res = await eth_getLogs([{ fromBlock: 'latest', toBlock: 5 }]);
        expect(res.data.result).to.deep.equal([]);

        res = await eth_getLogs([{ fromBlock: 'latest', toBlock: '0x5' }]);
        expect(res.data.result).to.deep.equal([]);

        res = await eth_getLogs([{ fromBlock: 8, toBlock: 'earliest' }]);
        expect(res.data.result).to.deep.equal([]);

        /* ---------- should return some logs ---------- */
        const from = 8;
        const to = 10;
        res = await eth_getLogs([{ fromBlock: from, toBlock: 'latest' }]);
        expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= from);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
        expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) <= to);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
        expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= from && parseInt(l.blockNumber) <= to);
        expectLogsEqual(res.data.result, expectedLogs);
      });
    });

    describe.concurrent('filter by topics', () => {
      it('returns correct logs', async () => {
        let res: Awaited<ReturnType<typeof eth_getLogs>>;
        let expectedLogs: LogHexified[];

        /* ---------- should return all logs ---------- */
        res = await eth_getLogs([{ topics: [], ...ALL_BLOCK_RANGE_FILTER }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ topics: [[]], ...ALL_BLOCK_RANGE_FILTER }]);
        expectLogsEqual(res.data.result, allLogs);

        res = await eth_getLogs([{ topics: [null, [], null, [], 'hahahahaha', 'hohoho'], ...ALL_BLOCK_RANGE_FILTER }]);
        expectLogsEqual(res.data.result, allLogs);

        /* ---------- should return no logs ---------- */
        res = await eth_getLogs([{ topics: ['XXX'], ...ALL_BLOCK_RANGE_FILTER }]);
        expect(res.data.result).to.deep.equal([]);

        /* ---------- should return some logs ---------- */
        for (const log of allLogs) {
          res = await eth_getLogs([{ topics: log.topics, ...ALL_BLOCK_RANGE_FILTER }]);
          expectedLogs = allLogs.filter(
            l => log.topics.length === l.topics.length && log.topics.every((t, i) => l.topics[i] === t)
          );
          expectLogsEqual(res.data.result, expectedLogs);

          res = await eth_getLogs([{ topics: [log.topics[0]], ...ALL_BLOCK_RANGE_FILTER }]);
          expectedLogs = allLogs.filter(l => l.topics[0] === log.topics[0]);
          expectLogsEqual(res.data.result, expectedLogs);

          res = await eth_getLogs([
            { topics: [['ooo', log.topics[0], 'xxx', 'yyy'], null, []], ...ALL_BLOCK_RANGE_FILTER },
          ]);
          expectedLogs = allLogs.filter(l => l.topics[0] === log.topics[0]);
          expectLogsEqual(res.data.result, expectedLogs);

          res = await eth_getLogs([
            { topics: [...new Array(log.topics.length - 1).fill(null), log.topics.at(-1)], ...ALL_BLOCK_RANGE_FILTER },
          ]);
          expectedLogs = allLogs.filter(l => l.topics[log.topics.length - 1] === log.topics.at(-1));
          expectLogsEqual(res.data.result, expectedLogs);
        }
      });
    });

    describe.concurrent('filter by blockhash', () => {
      it('returns correct logs', async () => {
        const allLogsFromSubql = await subql.getAllLogs().then(logs => logs.map(hexilifyLog));
        for (const log of allLogsFromSubql) {
          const res = await eth_getLogs([{ blockHash: log.blockHash }]);
          const expectedLogs = allLogs.filter(l => l.blockNumber === log.blockNumber);
          expectLogsEqual(res.data.result, expectedLogs);
        }
      });
    });

    describe.concurrent('filter by multiple params', () => {
      it('returns correct logs', async () => {
        let res: Awaited<ReturnType<typeof eth_getLogs>>;
        let expectedLogs: LogHexified[];
        const allLogsFromSubql = await subql.getAllLogs().then(logs => logs.map(hexilifyLog));
        /* -------------------- match block range -------------------- */
        expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) >= 8 && parseInt(l.blockNumber) <= 11);
        res = await eth_getLogs([{ fromBlock: 8, toBlock: 11, topics: [[], null, []] }]);
        expectLogsEqual(res.data.result, expectedLogs);

        expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) <= 15);
        res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: 15, topics: [[], null, []] }]);
        expectLogsEqual(res.data.result, expectedLogs);

        for (const log of allLogsFromSubql) {
          /* -------------------- match blockhash -------------------- */
          expectedLogs = allLogs.filter(l => parseInt(l.blockNumber) === parseInt(log.blockNumber));
          res = await eth_getLogs([{ blockHash: log.blockHash, topics: [[], null, []] }]);
          expectLogsEqual(res.data.result, expectedLogs);

          /* -------------------- match first topic -------------------- */
          expectedLogs = allLogs.filter(
            l => parseInt(l.blockNumber) === parseInt(log.blockNumber) && l.topics[0] === log.topics[0]
          );
          res = await eth_getLogs([{ blockHash: log.blockHash, topics: [[log.topics[0], 'xxx'], null, []] }]);
          expectLogsEqual(res.data.result, expectedLogs);

          /* -------------------- match range and topics -------------------- */
          expectedLogs = allLogs.filter(
            l => parseInt(l.blockNumber) >= 8 && parseInt(l.blockNumber) <= 15 && l.topics[0] === log.topics[0]
          );
          res = await eth_getLogs([{ fromBlock: 8, toBlock: 15, topics: [['xxx', log.topics[0]]] }]);
          expectLogsEqual(res.data.result, expectedLogs);

          /* -------------------- no match -------------------- */
          res = await eth_getLogs([{ blockHash: log.blockHash, topics: ['0x12345'] }]);
          expect(res.data.result).to.deep.equal([]);

          res = await eth_getLogs([{ blockHash: log.blockHash, topics: [log.topics[0], 'xxx'] }]);
          expect(res.data.result).to.deep.equal([]);
        }
      });
    });

    describe('get latest logs', async () => {
      const provider = new AcalaJsonRpcProvider(RPC_URL);
      const wallet = new Wallet(evmAccounts[0].privateKey, provider);
      let token: Contract;

      beforeAll(async () => {
        // need to put in here to prevent interrupte deterministic setup
        token = await deployErc20(wallet);
        await token.deployed();
      });

      it('should return latest logs as soon as it\'s finalized, and should not hang if toBlock is large', async () => {
        const curHeight = await provider.getBlockNumber();
        await (await token.transfer(ADDRESS_ALICE, 1000)).wait();

        // should return latest logs as soon as it's finalized
        const targetHeight = curHeight + 1;
        await waitForHeight(provider, targetHeight);    // instant-sealing: best height = finalized height
        const res = await eth_getLogs([{ fromBlock: targetHeight, toBlock: targetHeight }]);

        expect(res.data?.result?.length).to.eq(1);
        expect(parseInt(res.data.result[0].blockNumber, 16)).to.eq(targetHeight);

        // should not hang if toBlock is large
        const res2 = await eth_getLogs([{ fromBlock: targetHeight, toBlock: 9999999999 }]);
        expect(res2.data.result).to.deep.equal(res.data.result);
      });

      it('should return latest logs before subql is synced', async () => {
        const curHeight = await provider.getBlockNumber();

        for (let i = 0; i < 5; i++) {
          const tx = await token.transfer(ADDRESS_ALICE, 1000);
          await tx.wait();
        }

        const targetHeight = curHeight + 5;
        await waitForHeight(provider, targetHeight);
        const res = await eth_getLogs([{ fromBlock: targetHeight, toBlock: targetHeight }]);

        expect(res.data?.result?.length).to.eq(1);
        expect(parseInt(res.data.result[0].blockNumber, 16)).to.eq(targetHeight);
      });
    });
  });

  describe('eth_getTransactionReceipt', () => {
    it('returns correct result when hash exist for local transactions', async () => {
      const allTxReceipts = await subql.getAllTxReceipts();
      expect(allTxReceipts.length).to.greaterThan(0);

      const tx1 = allTxReceipts.find(r => r.blockNumber === '10');
      const tx2 = allTxReceipts.find(r => r.blockNumber === '9');
      const tx3 = allTxReceipts.find(r => r.blockNumber === '6');
      const tx4 = allTxReceipts.find(r => r.blockNumber === '20');

      const [
        res1,
        res2,
        res3,
        res4,   // dex.swap with erc20 tokens
      ] = await Promise.all([
        eth_getTransactionReceipt([tx1.transactionHash]),
        eth_getTransactionReceipt([tx2.transactionHash]),
        eth_getTransactionReceipt([tx3.transactionHash]),
        eth_getTransactionReceipt([tx4.transactionHash]),
      ]);

      expect(toDeterministic(res1.data.result)).toMatchSnapshot();
      expect(toDeterministic(res2.data.result)).toMatchSnapshot();
      expect(toDeterministic(res3.data.result)).toMatchSnapshot();
      expect(toDeterministic(res4.data.result)).toMatchSnapshot();
    });

    it('returns correct result for public karura transactions', async () => {
      if (process.env.SKIP_PUBLIC) {
        console.log('public karura tests are skipped ❗');
        return;
      }

      const [
        contractCallRes,
        contractDeployRes,
        sendKarRes,
      ] = await Promise.all([
        eth_getTransactionReceipt_karura([KARURA_CONTRACT_CALL_TX_HASH]),
        eth_getTransactionReceipt_karura([KARURA_CONTRACT_DEPLOY_TX_HASH]),
        eth_getTransactionReceipt_karura([KARURA_SEND_KAR_TX_HASH]),
      ]);

      expect(contractCallRes.status).to.equal(200);
      expect(contractDeployRes.status).to.equal(200);
      expect(sendKarRes.status).to.equal(200);

      expect(toDeterministic(contractCallRes.data.result)).toMatchSnapshot();
      expect(toDeterministic(contractDeployRes.data.result)).toMatchSnapshot();
      expect(toDeterministic(sendKarRes.data.result)).toMatchSnapshot();
    });

    it('return correct error or null', async () => {
      let res;

      /* ---------- invalid hex address ---------- */
      res = await eth_getTransactionReceipt(['0x000']);
      expect(res.data.error.code).to.equal(-32602);
      expect(res.data.error.message).to.contain('invalid argument');

      /* ---------- hash not found ---------- */
      res = await eth_getTransactionReceipt(['0x7ae069634d1154c0299f7fe1d473cf3d6f06cd9b57182d5319eede35a3a4d776']);
      expect(res.data.result).to.equal(null);

      /* ---------- TODO: pending tx ---------- */
    });

    describe('get latest receipt', async () => {
      const provider = new AcalaJsonRpcProvider(RPC_URL);
      const wallet = new Wallet(evmAccounts[0].privateKey, provider);
      let token: Contract;

      beforeAll(async () => {
        // need to put in here to prevent interrupte deterministic setup
        token = await deployErc20(wallet);
        await token.deployed();
      });

      it('should be able to get latest receipt as soon as new block is ready', async () => {
        const curHeight = await provider.getBlockNumber();
        await (await token.transfer(ADDRESS_ALICE, 1000)).wait();

        // should return latest receipt as soon as block is ready
        const targetHeight = curHeight + 1;
        await waitForHeight(provider, targetHeight);
        const blockRes = await eth_getBlockByNumber([targetHeight, false]);
        const txHashes = blockRes.data?.result.transactions;
        expect(txHashes.length).to.eq(1);
        const txHash = txHashes[0];

        const receipt = (await eth_getTransactionReceipt([txHash])).data?.result;
        expect(receipt).to.not.be.null;
        expect(parseInt(receipt.blockNumber, 16)).to.eq(targetHeight);
      });
    });
  });

  describe('eth_getTransactionByHash', () => {
    it('finds correct tx when hash exist for local transactions', async () => {
      const allTxReceipts = await subql.getAllTxReceipts();
      const tx1 = allTxReceipts.find(r => r.blockNumber === '10');
      const tx2 = allTxReceipts.find(r => r.blockNumber === '9');
      const tx3 = allTxReceipts.find(r => r.blockNumber === '6');
      const tx4 = allTxReceipts.find(r => r.blockNumber === '20');

      const [
        res1,
        res2,
        res3,
        res4,   // dex.swap with erc20 tokens
      ] = await Promise.all([
        eth_getTransactionByHash([tx1.transactionHash]),
        eth_getTransactionByHash([tx2.transactionHash]),
        eth_getTransactionByHash([tx3.transactionHash]),
        eth_getTransactionByHash([tx4.transactionHash]),
      ]);

      expect(toDeterministic(res1.data.result)).toMatchSnapshot();
      expect(toDeterministic(res2.data.result)).toMatchSnapshot();
      expect(toDeterministic(res3.data.result)).toMatchSnapshot();
      expect(toDeterministic(res4.data.result)).toMatchSnapshot();
    });

    it('returns correct result for public karura transactions', async () => {
      if (process.env.SKIP_PUBLIC) {
        console.log('public karura tests are skipped❗');
        return;
      }

      const [
        contractCallRes,
        contractDeployRes,
        sendKarRes,
      ] = await Promise.all([
        eth_getTransactionByHash_karura([KARURA_CONTRACT_CALL_TX_HASH]),
        eth_getTransactionByHash_karura([KARURA_CONTRACT_DEPLOY_TX_HASH]),
        eth_getTransactionByHash_karura([KARURA_SEND_KAR_TX_HASH]),
      ]);

      expect(contractCallRes.status).to.equal(200);
      expect(contractDeployRes.status).to.equal(200);
      expect(sendKarRes.status).to.equal(200);

      expect(toDeterministic(contractCallRes.data.result)).toMatchSnapshot();
      expect(toDeterministic(contractDeployRes.data.result)).toMatchSnapshot();
      expect(toDeterministic(sendKarRes.data.result)).toMatchSnapshot();
    });

    it.skip('returns correct result when tx is pending', async () => {
      // send a 0 tx to mandala
    });

    it('return correct error or null', async () => {
      let res;

      /* ---------- invalid hex address ---------- */
      res = await eth_getTransactionByHash(['0x000']);
      expect(res.data.error.code).to.equal(-32602);
      expect(res.data.error.message).to.contain('invalid argument');

      /* ---------- hash not found ---------- */
      res = await eth_getTransactionByHash(['0x7ae069634d1154c0299f7fe1d473cf3d6f06cd9b57182d5319eede35a3a4d776']);
      expect(res.data.result).to.equal(null);
    });
  });


  describe('eth_getBlockByNumber', () => {
    if (process.env.SKIP_PUBLIC) {
      console.log('public karura tests are skipped ❗');
      return;
    }

    it('when there are 0 EVM transactions', async () => {
      const resFull = (await eth_getBlockByNumber_karura([1818188, true])).data.result;
      const res = (await eth_getBlockByNumber_karura([1818188, false])).data.result;

      expect(resFull).toMatchSnapshot();
      expect(res).toMatchSnapshot();
    });

    it('when there are 1 EVM transactions', async () => {
      const resFull = (await eth_getBlockByNumber_karura([1818518, true])).data.result;
      const res = (await eth_getBlockByNumber_karura([1818518, false])).data.result;

      expect(resFull).toMatchSnapshot();
      expect(res).toMatchSnapshot();
    });

    it('when there are >= 2 EVM transactions', async () => {
      const resFull = (await eth_getBlockByNumber_karura([2449983, true])).data.result;
      const res = (await eth_getBlockByNumber_karura([2449983, false])).data.result;

      expect(resFull).toMatchSnapshot();
      expect(res).toMatchSnapshot();
    });

    it('for very old runtime', async () => {
      const resFull = (await eth_getBlockByNumber_karura([372268, true])).data.result;
      const res = (await eth_getBlockByNumber_karura([372268, false])).data.result;

      expect(resFull).toMatchSnapshot();
      expect(res).toMatchSnapshot();
    });
  });

  describe('eth_getBalance', () => {
    it('get correct balance', async () => {
      const block8Balance = 8999995192165097994000000n; // edit me for different mandala version
      expect(BigInt((await eth_getBalance([ADDRESS_ALICE, 8])).data.result)).to.equal(block8Balance);
      expect(BigInt((await eth_getBalance([ADDRESS_ALICE, '0x8'])).data.result)).to.equal(block8Balance);
      expect(BigInt((await eth_getBalance([ADDRESS_ALICE, { blockNumber: 8 }])).data.result)).to.equal(block8Balance);

      const curBlock = (await eth_blockNumber([])).data.result;
      expect(Number((await eth_getBalance([ADDRESS_ALICE, { blockNumber: curBlock }])).data.result)).to.equal(
        Number((await eth_getBalance([ADDRESS_ALICE, 'latest'])).data.result)
      );
    });
  });

  describe('eth_getTransactionCount', () => {
    it('get correct transaction', async () => {
      expect(Number((await eth_getTransactionCount([ADDRESS_ALICE, 1])).data.result)).to.equal(0);
      expect(Number((await eth_getTransactionCount([ADDRESS_ALICE, '0x5'])).data.result)).to.equal(1);
      expect(Number((await eth_getTransactionCount([ADDRESS_ALICE, { blockNumber: 8 }])).data.result)).to.equal(4);

      const curBlock = (await eth_blockNumber([])).data.result;
      expect(Number((await eth_getTransactionCount([ADDRESS_ALICE, { blockNumber: curBlock }])).data.result)).to.equal(
        Number((await eth_getTransactionCount([ADDRESS_ALICE, 'latest'])).data.result)
      );
    });
  });

  describe('eth_getStorageAt', () => {
    if (process.env.SKIP_PUBLIC) {
      console.log('public karura tests are skipped ❗');
      return;
    }

    it('get correct storage from public karura', async () => {
      const contractAddr = '0x1f3a10587a20114ea25ba1b388ee2dd4a337ce27';
      expect(
        (
          await eth_getStorageAt_karura([
            contractAddr,
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            2000000,
          ])
        ).data.result
      ).to.equal('0x55534420436f696e000000000000000000000000000000000000000000000010');

      expect((await eth_getStorageAt_karura([contractAddr, '0x0', 2000000])).data.result).to.equal(
        '0x55534420436f696e000000000000000000000000000000000000000000000010'
      );

      expect((await eth_getStorageAt_karura([contractAddr, '0x3', 2000000])).data.result).to.equal(
        '0x000000000000000000000000000000000000000000000000000000070d785f88'
      );
    });
  });

  describe('eth_newBlockFilter', () => {
    const provider = new EvmRpcProvider(NODE_RPC_URL);
    const aca = new Contract(ADDRESS.ACA, TokenABI.abi, wallet1.connect(provider));

    const dummyId = '0x12345678906f9c864d9db560d72a247c178ae86b';
    let blockFilterId0: string;
    let blockFilterId1: string;
    const expectedBlockHashes: string[] = [];
    const allBlockHashes: string[] = [];

    const feedTx = async () => {
      await aca.transfer(evmAccounts[1].evmAddress, 111222333444555);
      expectedBlockHashes.push(await getCurBlockHash());
      allBlockHashes.push(await getCurBlockHash());
    };

    beforeAll(async () => {
      blockFilterId0 = (await eth_newBlockFilter()).data.result; // only pull once at the end
      blockFilterId1 = (await eth_newBlockFilter()).data.result; // normal block poll

      await provider.isReady();
    });

    afterAll(async () => {
      await provider.disconnect();
    });

    it('poll immediately', async () => {
      const res = (await eth_getFilterChanges([blockFilterId1])).data.result;
      expect(res).to.deep.equal([]);
    });

    it('get correct result', async () => {
      /* ---------- fire 1 tx ---------- */
      await feedTx();
      await sleep(10000); // give subql some time to index

      let res = (await eth_getFilterChanges([blockFilterId1])).data.result;
      expect(res.length).to.equal(1);
      expect(res).to.deep.equal(expectedBlockHashes);
      expectedBlockHashes.length = 0;

      /* ---------- fire many tx ---------- */
      const txCount = 6;
      for (let i = 0; i < txCount; i++) {
        await feedTx();
      }
      await sleep(10000); // give subql some time to index

      res = (await eth_getFilterChanges([blockFilterId1])).data.result;
      let resAll = (await eth_getFilterChanges([blockFilterId0])).data.result;
      expect(res.length).to.equal(txCount);
      expect(resAll.length).to.equal(txCount + 1);
      expect(res).to.deep.equal(expectedBlockHashes);
      expect(resAll).to.deep.equal(allBlockHashes);

      // query again should return empty
      res = (await eth_getFilterChanges([blockFilterId1])).data.result;
      resAll = (await eth_getFilterChanges([blockFilterId0])).data.result;
      expect(res).to.deep.equal([]);
      expect(resAll).to.deep.equal([]);
    });

    it('unsubscribe works', async () => {
      expectedBlockHashes.length = 0;
      const unsub = (await eth_uninstallFilter([blockFilterId0])).data.result;
      const unsub2 = (await eth_uninstallFilter([blockFilterId0])).data.result;
      const unsub3 = (await eth_uninstallFilter([dummyId])).data.result;
      expect(unsub).to.equal(true);
      expect(unsub2).to.equal(false);
      expect(unsub3).to.equal(false);

      await feedTx();
      await sleep(10000); // give subql some time to index

      // other filter should still work
      let res = (await eth_getFilterChanges([blockFilterId1])).data.result;
      expect(res.length).to.equal(1);
      expect(res).to.deep.equal(expectedBlockHashes);

      // target filter should be removed
      res = await eth_getFilterChanges([blockFilterId0]);
      expect(res.data.error.message).to.contains('filter not found');
    });

    it('throws correct error', async () => {
      let res = await eth_getFilterChanges([dummyId]);
      expect(res.data.error.message).to.contains('filter not found');

      // eth_getFilterLogs should not find block filter
      res = await eth_getFilterLogs([blockFilterId1]);
      expect(res.data.error.message).to.contains('filter not found');
    });
  });

  describe('eth_newFilter', () => {
    const provider = new EvmRpcProvider(NODE_RPC_URL);
    const aca = new Contract(ADDRESS.ACA, TokenABI.abi, wallet1.connect(provider));

    const dummyId = '0x12345678906f9c864d9db560d72a247c178ae86b';
    let startBlockNum: number;
    let logFilterId0: string;
    let logFilterId1: string;
    let logFilterId2: string;
    let logFilterId3: string;

    const feedTx = async () => aca.transfer(evmAccounts[1].evmAddress, 111222333444555);

    beforeAll(async () => {
      startBlockNum = Number((await eth_blockNumber()).data.result);

      logFilterId0 = (await eth_newFilter([{}])).data.result; // only pull once at the end
      logFilterId1 = (
        await eth_newFilter([
          {
            // normal log poll
            address: ADDRESS.ACA,
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              null,
              ['0x12332', '0x000000000000000000000000b00cb924ae22b2bbb15e10c17258d6a2af980421', '0x78723681eeeee'],
            ],
          },
        ])
      ).data.result;
      logFilterId2 = (
        await eth_newFilter([
          {
            // normal log poll
            address: ADDRESS.ACA,
            fromBlock: startBlockNum,
            toBlock: startBlockNum + 3,
          },
        ])
      ).data.result;
      logFilterId3 = (
        await eth_newFilter([
          {
            // empty
            fromBlock: 3,
            toBlock: 5,
          },
        ])
      ).data.result;

      await provider.isReady();
    });

    afterAll(async () => {
      await provider.disconnect();
    });

    it('poll immediately', async () => {
      const res1 = (await eth_getFilterChanges([logFilterId1])).data.result;
      const res2 = (await eth_getFilterChanges([logFilterId2])).data.result;
      const res3 = (await eth_getFilterChanges([logFilterId3])).data.result;

      expect([res1, res2, res3]).to.deep.equal([[], [], []]);
    });

    it('get correct result', async () => {
      /* ---------- fire 1 tx ---------- */
      await feedTx();
      await sleep(10000); // give subql some time to index

      let res1 = (await eth_getFilterChanges([logFilterId1])).data.result;
      let res2 = (await eth_getFilterChanges([logFilterId2])).data.result;
      let res3 = (await eth_getFilterChanges([logFilterId3])).data.result;

      const curBlockHash = await getCurBlockHash();
      let expectedLogs = (await eth_getLogs([{ blockHash: curBlockHash }])).data.result;

      expect(expectedLogs.length).to.equal(1);
      expect(res1).to.deep.equal(expectedLogs);
      expect(res2).to.deep.equal(expectedLogs);
      expect(res3).to.deep.equal([]);

      /* ---------- fire many tx ---------- */
      const txCount = 5;
      for (let i = 0; i < txCount; i++) {
        await feedTx();
      }
      await sleep(10000); // give subql some time to index

      const res0 = (await eth_getFilterChanges([logFilterId0])).data.result;
      res1 = (await eth_getFilterChanges([logFilterId1])).data.result;
      res2 = (await eth_getFilterChanges([logFilterId2])).data.result;
      res3 = (await eth_getFilterChanges([logFilterId3])).data.result;

      const curHeight = Number((await eth_blockNumber()).data.result);
      expectedLogs = (
        await eth_getLogs([
          {
            fromBlock: curHeight - txCount,
            toBlock: curHeight,
          },
        ])
      ).data.result;

      expect(expectedLogs.length).to.equal(txCount + 1); // + 1 because it's all logs, which conains the one in prev test
      expect(res0).to.deep.equal(expectedLogs);
      expect(res1).to.deep.equal(expectedLogs.slice(1));
      // it's range is [x, x + 3], x is original block, x + 1 is prev test, now only poll for x + 2 and x + 3, so has 2 logs
      expect(res2).to.deep.equal(expectedLogs.slice(1, 3));
      expect(res3).to.deep.equal([]);
    });

    it('unsubscribe works', async () => {
      const unsub = (await eth_uninstallFilter([logFilterId0])).data.result;
      const unsub2 = (await eth_uninstallFilter([logFilterId0])).data.result;
      const unsub3 = (await eth_uninstallFilter([dummyId])).data.result;
      expect(unsub).to.equal(true);
      expect(unsub2).to.equal(false);
      expect(unsub3).to.equal(false);

      await feedTx();
      await sleep(10000); // give subql some time to index

      const res1 = (await eth_getFilterChanges([logFilterId1])).data.result;
      const res2 = (await eth_getFilterChanges([logFilterId2])).data.result;
      const res3 = (await eth_getFilterChanges([logFilterId3])).data.result;

      const curBlockHash = await getCurBlockHash();
      const expectedLogs = (await eth_getLogs([{ blockHash: curBlockHash }])).data.result;

      // all other filters should still work
      expect(expectedLogs.length).to.equal(1);
      expect(res1).to.deep.equal(expectedLogs);
      expect(res2).to.deep.equal([]); // now block range doesn't match anymore
      expect(res3).to.deep.equal([]);

      // target should be removed
      const res0 = await eth_getFilterChanges([logFilterId0]);
      expect(res0.data.error.message).to.contains('filter not found');
    });

    it.skip('throws correct error messege', async () => {
      // tested in eth_newBlockFilter
    });
  });

  // mostly a copy of eth_newFilter tests, but use eth_getFilterLogs instead of eth_getFilterChanges
  describe('eth_getFilterLogs', () => {
    const provider = new EvmRpcProvider(NODE_RPC_URL);
    const aca = new Contract(ADDRESS.ACA, TokenABI.abi, wallet1.connect(provider));

    const dummyId = '0x12345678906f9c864d9db560d72a247c178ae86b';
    let startBlockNum: number;
    let logFilterId0: string;
    let logFilterId1: string;
    let logFilterId2: string;
    let logFilterId3: string;

    const feedTx = async () => aca.transfer(evmAccounts[1].evmAddress, 111222333444555);

    beforeAll(async () => {
      startBlockNum = Number((await eth_blockNumber()).data.result);

      logFilterId0 = (await eth_newFilter([{}])).data.result; // only pull once at the end
      logFilterId1 = (
        await eth_newFilter([
          {
            // normal log poll
            address: ADDRESS.ACA,
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              null,
              ['0x12332', '0x000000000000000000000000b00cb924ae22b2bbb15e10c17258d6a2af980421', '0x78723681eeeee'],
            ],
          },
        ])
      ).data.result;
      logFilterId2 = (
        await eth_newFilter([
          {
            // normal log poll
            address: ADDRESS.ACA,
            fromBlock: startBlockNum,
            toBlock: startBlockNum + 3,
          },
        ])
      ).data.result;
      logFilterId3 = (
        await eth_newFilter([
          {
            // empty
            fromBlock: 3,
            toBlock: 5,
          },
        ])
      ).data.result;

      await provider.isReady();
    });

    afterAll(async () => {
      await provider.disconnect();
    });

    it('poll immediately', async () => {
      const res1 = (await eth_getFilterLogs([logFilterId1])).data.result;
      const res2 = (await eth_getFilterLogs([logFilterId2])).data.result;
      const res3 = (await eth_getFilterLogs([logFilterId3])).data.result;

      expect([res1, res2, res3]).to.deep.equal([[], [], []]);
    });

    it('get correct result', async () => {
      /* ---------- fire 1 tx ---------- */
      await feedTx();
      await sleep(10000); // give subql some time to index

      let res1 = (await eth_getFilterLogs([logFilterId1])).data.result;
      let res2 = (await eth_getFilterLogs([logFilterId2])).data.result;
      let res3 = (await eth_getFilterLogs([logFilterId3])).data.result;

      const curBlockHash = await getCurBlockHash();
      let expectedLogs = (await eth_getLogs([{ blockHash: curBlockHash }])).data.result;

      expect(expectedLogs.length).to.equal(1);
      expect(res1).to.deep.equal(expectedLogs);
      expect(res2).to.deep.equal(expectedLogs);
      expect(res3).to.deep.equal([]);

      /* ---------- fire many tx ---------- */
      const txCount = 5;
      for (let i = 0; i < txCount; i++) {
        await feedTx();
      }
      await sleep(10000); // give subql some time to index

      const res0 = (await eth_getFilterLogs([logFilterId0])).data.result;
      res1 = (await eth_getFilterLogs([logFilterId1])).data.result;
      res2 = (await eth_getFilterLogs([logFilterId2])).data.result;
      res3 = (await eth_getFilterLogs([logFilterId3])).data.result;

      const curHeight = Number((await eth_blockNumber()).data.result);
      expectedLogs = (
        await eth_getLogs([
          {
            fromBlock: curHeight - txCount,
            toBlock: curHeight,
          },
        ])
      ).data.result;

      expect(expectedLogs.length).to.equal(txCount + 1); // + 1 because it's all logs, which conains the one in prev test
      expect(res0).to.deep.equal(expectedLogs);
      expect(res1).to.deep.equal(expectedLogs.slice(1));
      // it's range is [x, x + 3], x is original block, x + 1 is prev test, now only poll for x + 2 and x + 3, so has 2 logs
      expect(res2).to.deep.equal(expectedLogs.slice(1, 3));
      expect(res3).to.deep.equal([]);
    });

    it('unsubscribe works', async () => {
      const unsub = (await eth_uninstallFilter([logFilterId0])).data.result;
      const unsub2 = (await eth_uninstallFilter([logFilterId0])).data.result;
      const unsub3 = (await eth_uninstallFilter([dummyId])).data.result;
      expect(unsub).to.equal(true);
      expect(unsub2).to.equal(false);
      expect(unsub3).to.equal(false);

      await feedTx();
      await sleep(10000); // give subql some time to index

      const res1 = (await eth_getFilterLogs([logFilterId1])).data.result;
      const res2 = (await eth_getFilterLogs([logFilterId2])).data.result;
      const res3 = (await eth_getFilterLogs([logFilterId3])).data.result;

      const curBlockHash = await getCurBlockHash();
      const expectedLogs = (await eth_getLogs([{ blockHash: curBlockHash }])).data.result;

      // all other filters should still work
      expect(expectedLogs.length).to.equal(1);
      expect(res1).to.deep.equal(expectedLogs);
      expect(res2).to.deep.equal([]); // now block range doesn't match anymore
      expect(res3).to.deep.equal([]);

      // target should be removed
      const res0 = await eth_getFilterLogs([logFilterId0]);
      expect(res0.data.error!.message).to.contains('filter not found');
    });

    it('throws correct error messege', async () => {
      const res = await eth_getFilterLogs([dummyId]);
      expect(res.data.error!.message).to.contains('filter not found');
    });
  });
});
