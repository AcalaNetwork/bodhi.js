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
import { AcalaJsonRpcProvider, DUMMY_LOGS_BLOOM, EvmRpcProvider, ONE_HUNDRED_GWEI, nativeToEthDecimal, sleep } from '@acala-network/eth-providers';
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
  eth_getEthResources,
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
} from './utils';

import {
  ADDRESS_ALICE,
  DETERMINISTIC_SETUP_DEX_ADDRESS,
  KARURA_CONTRACT_CALL_TX_HASH,
  KARURA_CONTRACT_DEPLOY_TX_HASH,
  KARURA_SEND_KAR_TX_HASH,
  LogHexified,
  allLogs,
  deployHelloWorldData,
  evmAccounts,
  karuraBlock1818188,
  karuraBlock1818518,
  karuraBlock2449983,
  karuraContractCallTx,
  karuraContractCallTxReceipt,
  karuraContractDeployTx,
  karuraContractDeployTxReceipt,
  karuraSendKarTx,
  karuraSendKarTxReceipt,
  log22_0,
  log22_1,
} from './consts';

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
      let [allTxReceipts, allLogs] = await Promise.all([subql.getAllTxReceipts(), subql.getAllLogs()]);
      while (
        (allTxReceipts.length < DETERMINISTIC_SETUP_TOTAL_TXS || allLogs.length < DETERMINISTIC_SETUP_TOTAL_LOGS) &&
        tries++ < 10
      ) {
        console.log(`let's give subql a little bit more time to index, retrying #${tries} in 5s ...`);
        await sleep(10000);
        [allTxReceipts, allLogs] = await Promise.all([subql.getAllTxReceipts(), subql.getAllLogs()]);
      }

      if (allTxReceipts.length < DETERMINISTIC_SETUP_TOTAL_TXS || allLogs.length < DETERMINISTIC_SETUP_TOTAL_LOGS) {
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

  describe('eth_getTransactionReceipt', () => {
    it('returns correct result when hash exist for local transactions', async () => {
      const allTxReceipts = await subql.getAllTxReceipts();

      expect(allTxReceipts.length).to.greaterThan(0);

      let txR = allTxReceipts.find((r) => r.blockNumber === '10');
      let res = await eth_getTransactionReceipt([txR.transactionHash]);
      expect(res.data.result).to.deep.contains({
        to: '0x0230135fded668a3f7894966b14f42e65da322e4',
        from: ADDRESS_ALICE,
        contractAddress: null,
        transactionIndex: '0x0',
        gasUsed: '0x1a8a4',
        logsBloom: DUMMY_LOGS_BLOOM,
        blockHash: txR.blockHash,
        transactionHash: txR.transactionHash,
        logs: [
          {
            transactionIndex: '0x0',
            blockNumber: '0xa',
            transactionHash: txR.transactionHash,
            address: '0x0000000000000000000000000000000000000803',
            topics: [
              '0x7b1ccce9b5299ff0ae3d9adc0855268a4ad3527b2bcde01ccadde2fb878ecb8a',
              '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000748849ea0c000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000001',
            logIndex: '0x0',
            blockHash: txR.blockHash,
          },
        ],
        blockNumber: '0xa',
        cumulativeGasUsed: '0x0', // FIXME:
        // effectiveGasPrice: '0x7b501b0da7',
        status: '0x1',
        type: '0x0',
      });

      txR = allTxReceipts.find((r) => r.blockNumber === '9');
      res = await eth_getTransactionReceipt([txR.transactionHash]);
      expect(res.data.result).to.deep.contain({
        to: '0x0230135fded668a3f7894966b14f42e65da322e4',
        from: ADDRESS_ALICE,
        contractAddress: null,
        transactionIndex: '0x0',
        gasUsed: '0x1f615',
        logsBloom: DUMMY_LOGS_BLOOM,
        blockHash: txR.blockHash,
        transactionHash: txR.transactionHash,
        logs: [
          {
            transactionIndex: '0x0',
            blockNumber: '0x9',
            transactionHash: txR.transactionHash,
            address: '0x0000000000000000000000000000000000000803',
            topics: [
              '0x7b1ccce9b5299ff0ae3d9adc0855268a4ad3527b2bcde01ccadde2fb878ecb8a',
              '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000010000000000000000000000000000000000000000000100000000000000000002',
            logIndex: '0x0',
            blockHash: txR.blockHash,
          },
        ],
        blockNumber: '0x9',
        cumulativeGasUsed: '0x0', // FIXME:
        // effectiveGasPrice: '0x71ca23a4e3',
        status: '0x1',
        type: '0x0',
      });

      txR = allTxReceipts.find((r) => r.blockNumber === '6');
      res = await eth_getTransactionReceipt([txR.transactionHash]);
      expect(res.data.result).to.deep.contain({
        to: '0x0230135fded668a3f7894966b14f42e65da322e4',
        from: ADDRESS_ALICE,
        contractAddress: null,
        transactionIndex: '0x0',
        gasUsed: '0x1a8d3',
        logsBloom: DUMMY_LOGS_BLOOM,
        blockHash: txR.blockHash,
        transactionHash: txR.transactionHash,
        logs: [
          {
            transactionIndex: '0x0',
            blockNumber: '0x6',
            transactionHash: txR.transactionHash,
            address: '0x0000000000000000000000000000000000000803',
            topics: [
              '0x7b1ccce9b5299ff0ae3d9adc0855268a4ad3527b2bcde01ccadde2fb878ecb8a',
              '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000001d131f6171f000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000001',
            logIndex: '0x0',
            blockHash: txR.blockHash,
          },
        ],
        blockNumber: '0x6',
        cumulativeGasUsed: '0x0', // FIXME:
        // effectiveGasPrice: '0x7b3ad33de2',
        status: '0x1',
        type: '0x0',
      });

      // dex.swap with erc20
      txR = allTxReceipts.find((r) => r.blockNumber === '20');
      res = await eth_getTransactionReceipt([txR.transactionHash]);
      expect(res.data.result).to.deep.contain({
        to: DETERMINISTIC_SETUP_DEX_ADDRESS,
        from: ADDRESS_ALICE,
        contractAddress: null,
        transactionIndex: '0x0',
        gasUsed: '0xcbbd',
        logsBloom: DUMMY_LOGS_BLOOM,
        blockHash: txR.blockHash,
        transactionHash: txR.transactionHash,
        logs: [
          {
            transactionIndex: '0x0',
            blockNumber: '0x14',
            transactionHash: txR.transactionHash,
            address: DETERMINISTIC_SETUP_DEX_ADDRESS,
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0',
              '0x000000000000000000000000905c015e38c24ed973fd6075541a124c621fa743',
            ],
            data: '0x0000000000000000000000000000000000000000000000000000000000002710',
            logIndex: '0x0',
            blockHash: txR.blockHash,
          },
          {
            transactionIndex: '0x0',
            blockNumber: '0x14',
            transactionHash: txR.transactionHash,
            address: '0xe85ef9063dd28f157eb97ca03f50f4a3bdecd37e',
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0',
              '0x000000000000000000000000905c015e38c24ed973fd6075541a124c621fa743',
            ],
            data: '0x00000000000000000000000000000000000000000000000000000000000003e8',
            logIndex: '0x1',
            blockHash: txR.blockHash,
          },
        ],
        blockNumber: '0x14',
        cumulativeGasUsed: '0x0',
        // effectiveGasPrice: '0x8885941ca0',
        status: '0x1',
        type: '0x0',
      });
    });

    it('returns correct result for public karura transactions', async () => {
      if (process.env.SKIP_PUBLIC) {
        console.log('public karura tests are skipped ❗');
        return;
      }

      const [contractCallRes, contractDeployRes, sendKarRes] = await Promise.all([
        eth_getTransactionReceipt_karura([KARURA_CONTRACT_CALL_TX_HASH]),
        eth_getTransactionReceipt_karura([KARURA_CONTRACT_DEPLOY_TX_HASH]),
        eth_getTransactionReceipt_karura([KARURA_SEND_KAR_TX_HASH]),
      ]);

      expect(contractCallRes.status).to.equal(200);
      expect(contractDeployRes.status).to.equal(200);
      expect(sendKarRes.status).to.equal(200);

      expect(contractCallRes.data.result).to.deep.equal(karuraContractCallTxReceipt);
      expect(contractDeployRes.data.result).to.deep.equal(karuraContractDeployTxReceipt);
      expect(sendKarRes.data.result).to.deep.equal(karuraSendKarTxReceipt);
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
  });

  describe('eth_getLogs', () => {
    const ALL_BLOCK_RANGE_FILTER = { fromBlock: 'earliest' };

    describe('when no filter', () => {
      it('returns all logs from latest block', async () => {
        const res = (await eth_getLogs([{}])).data.result;
        expect(res.length).to.equal(2);
        expect(res[0]).to.deep.contain(log22_0);
        expect(res[1]).to.deep.contain(log22_1);
      });
    });

    describe('filter by address', () => {
      it('returns correct logs', async () => {
        /* ---------- single address ---------- */
        for (const log of allLogs) {
          const res = await eth_getLogs([{ address: log.address, ...ALL_BLOCK_RANGE_FILTER }]);
          const expectedLogs = allLogs.filter((l) => l.address === log.address);
          expectLogsEqual(res.data.result, expectedLogs);
        }

        // should support different case and array of addresses
        for (const log of allLogs) {
          const res = await eth_getLogs([
            { address: [log.address.toLocaleUpperCase(), '0x13579'], ...ALL_BLOCK_RANGE_FILTER },
          ]);
          const expectedLogs = allLogs.filter((l) => l.address === log.address);
          expectLogsEqual(res.data.result, expectedLogs);
        }
      });
    });

    describe('filter by block number', () => {
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
        expectedLogs = allLogs.filter((l) => parseInt(l.blockNumber) >= from);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
        expectedLogs = allLogs.filter((l) => parseInt(l.blockNumber) <= to);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
        expectedLogs = allLogs.filter((l) => parseInt(l.blockNumber) >= from && parseInt(l.blockNumber) <= to);
        expectLogsEqual(res.data.result, expectedLogs);
      });
    });

    describe('filter by block tag', () => {
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
        expectedLogs = allLogs.filter((l) => parseInt(l.blockNumber) >= from);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
        expectedLogs = allLogs.filter((l) => parseInt(l.blockNumber) <= to);
        expectLogsEqual(res.data.result, expectedLogs);

        res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
        expectedLogs = allLogs.filter((l) => parseInt(l.blockNumber) >= from && parseInt(l.blockNumber) <= to);
        expectLogsEqual(res.data.result, expectedLogs);
      });
    });

    describe('filter by topics', () => {
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
            (l) => log.topics.length === l.topics.length && log.topics.every((t, i) => l.topics[i] === t)
          );
          expectLogsEqual(res.data.result, expectedLogs);

          res = await eth_getLogs([{ topics: [log.topics[0]], ...ALL_BLOCK_RANGE_FILTER }]);
          expectedLogs = allLogs.filter((l) => l.topics[0] === log.topics[0]);
          expectLogsEqual(res.data.result, expectedLogs);

          res = await eth_getLogs([
            { topics: [['ooo', log.topics[0], 'xxx', 'yyy'], null, []], ...ALL_BLOCK_RANGE_FILTER },
          ]);
          expectedLogs = allLogs.filter((l) => l.topics[0] === log.topics[0]);
          expectLogsEqual(res.data.result, expectedLogs);

          res = await eth_getLogs([
            { topics: [...new Array(log.topics.length - 1).fill(null), log.topics.at(-1)], ...ALL_BLOCK_RANGE_FILTER },
          ]);
          expectedLogs = allLogs.filter((l) => l.topics[log.topics.length - 1] === log.topics.at(-1));
          expectLogsEqual(res.data.result, expectedLogs);
        }
      });
    });

    describe('filter by blockhash', () => {
      it('returns correct logs', async () => {
        const allLogsFromSubql = await subql.getAllLogs().then((logs) => logs.map(hexilifyLog));
        for (const log of allLogsFromSubql) {
          const res = await eth_getLogs([{ blockHash: log.blockHash }]);
          const expectedLogs = allLogs.filter((l) => l.blockNumber === log.blockNumber);
          expectLogsEqual(res.data.result, expectedLogs);
        }
      });
    });

    describe('filter by multiple params', () => {
      it('returns correct logs', async () => {
        let res: Awaited<ReturnType<typeof eth_getLogs>>;
        let expectedLogs: LogHexified[];
        const allLogsFromSubql = await subql.getAllLogs().then((logs) => logs.map(hexilifyLog));
        /* -------------------- match block range -------------------- */
        expectedLogs = allLogs.filter((l) => parseInt(l.blockNumber) >= 8 && parseInt(l.blockNumber) <= 11);
        res = await eth_getLogs([{ fromBlock: 8, toBlock: 11, topics: [[], null, []] }]);
        expectLogsEqual(res.data.result, expectedLogs);

        expectedLogs = allLogs.filter((l) => parseInt(l.blockNumber) <= 15);
        res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: 15, topics: [[], null, []] }]);
        expectLogsEqual(res.data.result, expectedLogs);

        for (const log of allLogsFromSubql) {
          /* -------------------- match blockhash -------------------- */
          expectedLogs = allLogs.filter((l) => parseInt(l.blockNumber) === parseInt(log.blockNumber));
          res = await eth_getLogs([{ blockHash: log.blockHash, topics: [[], null, []] }]);
          expectLogsEqual(res.data.result, expectedLogs);

          /* -------------------- match first topic -------------------- */
          expectedLogs = allLogs.filter(
            (l) => parseInt(l.blockNumber) === parseInt(log.blockNumber) && l.topics[0] === log.topics[0]
          );
          res = await eth_getLogs([{ blockHash: log.blockHash, topics: [[log.topics[0], 'xxx'], null, []] }]);
          expectLogsEqual(res.data.result, expectedLogs);

          /* -------------------- match range and topics -------------------- */
          expectedLogs = allLogs.filter(
            (l) => parseInt(l.blockNumber) >= 8 && parseInt(l.blockNumber) <= 15 && l.topics[0] === log.topics[0]
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
      });

      it('should return latest logs as soon as it\'s finalized, and should not hang if toBlock is large', async () => {
        const curblockNum = await provider.getBlockNumber();
        await (await token.transfer(ADDRESS_ALICE, 1000)).wait();

        // should return latest logs as soon as it's finalized
        const res = await eth_getLogs([{ fromBlock: curblockNum + 1, toBlock: curblockNum + 1 }]);
        expect(res.data.result.length).to.eq(1);

        // should not hang if toBlock is large
        const res2 = await eth_getLogs([{ fromBlock: curblockNum + 1, toBlock: 9999999999 }]);
        expect(res2.data.result).to.deep.equal(res.data.result);
      });

      it('should throw correct error is subql is not synced', async () => {
        const curblockNum = await provider.getBlockNumber();
        const pendings = [] as any[];
        for (let i = 0; i < 5; i++) {
          pendings.push(await token.transfer(ADDRESS_ALICE, 1000));
        }
        await Promise.all(pendings.map(p => p.wait()));

        const res = await eth_getLogs([{ fromBlock: curblockNum + 5, toBlock: curblockNum + 5 }]);
        expect(res.data.error?.message).to.contain('Error: subql indexer is not synced to target block');
      });
    });
  });

  describe('eth_getTransactionByHash', () => {
    it('finds correct tx when hash exist for local transactions', async () => {
      const allTxReceipts = await subql.getAllTxReceipts();
      const tx1 = allTxReceipts.find((r) => r.blockNumber === '10');
      const tx2 = allTxReceipts.find((r) => r.blockNumber === '9');
      const tx3 = allTxReceipts.find((r) => r.blockNumber === '6');
      const tx4 = allTxReceipts.find((r) => r.blockNumber === '20');

      let res = await eth_getTransactionByHash([tx1.transactionHash]);
      expect(res.data.result).to.deep.contain({
        blockHash: tx1.blockHash,
        blockNumber: '0xa',
        transactionIndex: '0x0',
        // gasPrice: '0x7b501b0da7',
        gas: '0x1e8481',
        input:
          '0x3d8d96200000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000001',
        v: '0x25',
        r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
        s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
        hash: tx1.transactionHash,
        nonce: '0x6',
        from: ADDRESS_ALICE,
        to: '0x0230135fded668a3f7894966b14f42e65da322e4',
        value: '0xde0b6b3a7640000',
      });

      res = await eth_getTransactionByHash([tx2.transactionHash]);
      expect(res.data.result).to.deep.contain({
        blockHash: tx2.blockHash,
        blockNumber: '0x9',
        transactionIndex: '0x0',
        // gasPrice: '0x71ca23a4e3',
        gas: '0x1e8481',
        input:
          '0x3d8d962000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000e8d4a510000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000010000000000000000000000000000000000000000000100000000000000000002',
        v: '0x25',
        r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
        s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
        hash: tx2.transactionHash,
        nonce: '0x5',
        from: ADDRESS_ALICE,
        to: '0x0230135fded668a3f7894966b14f42e65da322e4',
        value: '0xde0b6b3a7640000',
      });

      res = await eth_getTransactionByHash([tx3.transactionHash]);
      expect(res.data.result).to.deep.contain({
        blockHash: tx3.blockHash,
        blockNumber: '0x6',
        transactionIndex: '0x0',
        // gasPrice: '0x7b3ad33de2',
        gas: '0x1e8481',
        input:
          '0x6fc4b4e50000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000e8d4a510000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000001',
        v: '0x25',
        r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
        s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
        hash: tx3.transactionHash,
        nonce: '0x2',
        from: ADDRESS_ALICE,
        to: '0x0230135fded668a3f7894966b14f42e65da322e4',
        value: '0xde0b6b3a7640000',
      });

      // dex.swap with erc20 tokens
      res = await eth_getTransactionByHash([tx4.transactionHash]);
      expect(res.data.result).to.deep.contain({
        blockHash: tx4.blockHash,
        blockNumber: '0x14',
        transactionIndex: '0x0',
        hash: tx4.transactionHash,
        from: ADDRESS_ALICE,
        // gasPrice: '0x8885941ca0',
        value: '0x0',
        gas: '0x200b20',
        input: '0x',
        to: DETERMINISTIC_SETUP_DEX_ADDRESS,
        nonce: '0x10',
        v: '0x25',
        r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
        s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
      });
    });

    it('returns correct result for public karura transactions', async () => {
      if (process.env.SKIP_PUBLIC) {
        console.log('public karura tests are skipped❗');
        return;
      }

      const [contractCallRes, contractDeployRes, sendKarRes] = await Promise.all([
        eth_getTransactionByHash_karura([KARURA_CONTRACT_CALL_TX_HASH]),
        eth_getTransactionByHash_karura([KARURA_CONTRACT_DEPLOY_TX_HASH]),
        eth_getTransactionByHash_karura([KARURA_SEND_KAR_TX_HASH]),
      ]);

      expect(contractCallRes.status).to.equal(200);
      expect(contractDeployRes.status).to.equal(200);
      expect(sendKarRes.status).to.equal(200);

      expect(contractCallRes.data.result).to.deep.equal(karuraContractCallTx);
      expect(contractDeployRes.data.result).to.deep.equal(karuraContractDeployTx);
      expect(sendKarRes.data.result).to.deep.equal(karuraSendKarTx);
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

  describe('eth_accounts', () => {
    it('returns empty array', async () => {
      const res = await eth_accounts([]);
      expect(res.data.result).to.deep.equal([]);
    });
  });

  describe('eth_sendRawTransaction', async () => {
    const chainId = BigNumber.from((await eth_chainId()).data.result).toNumber();

    const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';
    const wsProvider = new WsProvider(endpoint);
    const api = await ApiPromise.create({ provider: wsProvider });

    const genesisHash = api.genesisHash.toHex(); // TODO: why EIP-712 salt has to be genesis hash?

    const ETH_Digits = 18;
    const ACA_Digits = 12;
    const TX_FEE_OFF_TOLERANCE = parseEther('0.01').toBigInt(); // 0.01 ACA

    const queryEthBalance = async (addr): Promise<BigNumber> =>
      BigNumber.from((await eth_getBalance([addr, 'latest'])).data.result);

    const queryNativeBalance = async (addr: string) => (await queryEthBalance(addr)).div(10 ** (ETH_Digits - ACA_Digits));

    const getTxFeeFromReceipt = async (txHash: string, toNative = false): Promise<bigint> => {
      await sleep(789); // give cache/subquery a little bit time
      const { gasUsed, effectiveGasPrice } = (await eth_getTransactionReceipt([txHash])).data.result;

      const calculatedTxFee = BigInt(gasUsed) * BigInt(effectiveGasPrice);

      return toNative
        ? calculatedTxFee / BigInt(10 ** (ETH_Digits - ACA_Digits))
        : calculatedTxFee;
    };

    afterAll(async () => {
      await api.disconnect();
    });

    describe('deploy contract (hello world)', () => {
      const partialDeployTx = {
        chainId,
        data: deployHelloWorldData,
        type: 0,
      };

      describe('with legacy EIP-155 signature', () => {
        it('send tx correctly, gas estimation is accurate, receipt\'s gas info is accurate', async () => {
          const prevBalance = await queryEthBalance(wallet1.address);

          const unsignedTx = {
            ...partialDeployTx,
            nonce: await getNonce(wallet1.address),
          };

          const { gasPrice, gasLimit } = await estimateGas(unsignedTx);

          const rawTx = await wallet1.signTransaction({
            ...unsignedTx,
            gasPrice,
            gasLimit,
          });

          const res = await eth_sendRawTransaction([rawTx]);
          expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

          const receiptTxFee = await getTxFeeFromReceipt(res.data.result);
          const afterBalance = await queryEthBalance(wallet1.address);

          const realTxFee = prevBalance.sub(afterBalance).toBigInt();
          const estimatedTxFee = gasPrice.mul(gasLimit).toBigInt();
          const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);
          const diffEstimateTxFee = bigIntDiff(realTxFee, estimatedTxFee);

          // console.log({
          //   estimatedTxFee: formatEther(estimatedTxFee),
          //   realTxFee: formatEther(realTxFee),
          //   receiptTxFee: formatEther(receiptTxFee),
          //   diffReceiptTxFee: formatEther(diffReceiptTxFee),
          //   diffEstimateTxFee: formatEther(diffEstimateTxFee),
          // });

          expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
          expect(diffEstimateTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
        });
      });

      describe('with EIP-1559 signature', () => {
        it('throw correct error', async () => {
          const unsignedTx = {
            ...partialDeployTx,
            nonce: await getNonce(wallet1.address),
            gasPrice: undefined,
            maxPriorityFeePerGas: BigNumber.from(0),
            maxFeePerGas: ONE_HUNDRED_GWEI,
            type: 2,
          };

          const rawTx = await wallet1.signTransaction(unsignedTx);

          const res = await eth_sendRawTransaction([rawTx]);
          expect(res.data.error?.message).to.contain('unsupported transaction type: 2, please use legacy or EIP-712 instead');
        });
      });

      describe('with EIP-712 signature', () => {
        it('send tx correctly, receipt\'s gas info is accurate', async () => {
          const prevBalance = await queryEthBalance(wallet1.address);

          const gasLimit = BigNumber.from('210000');
          const validUntil = 10000;
          const storageLimit = 100000;

          const unsignEip712Tx = {
            ...partialDeployTx,
            nonce: await getNonce(wallet1.address),
            salt: genesisHash,
            gasLimit,
            validUntil,
            storageLimit,
            type: 0x60,
          };

          const sig = signTransaction(account1.privateKey, unsignEip712Tx as AcalaEvmTXPayload);
          const rawTx = serializeTransaction(unsignEip712Tx as UnsignedAcalaEvmTX, sig);
          const parsedTx = parseTransaction(rawTx);

          expect(parsedTx.gasLimit.eq(gasLimit)).equal(true);
          expect(BigNumber.from(parsedTx.validUntil).eq(validUntil)).equal(true);
          expect(BigNumber.from(parsedTx.storageLimit).eq(storageLimit)).equal(true);

          expect(parsedTx.from).equal(wallet1.address);
          expect(parsedTx.data).equal(deployHelloWorldData);
          expect(parsedTx.type).equal(96);
          expect(parsedTx.maxPriorityFeePerGas).equal(undefined);
          expect(parsedTx.maxFeePerGas).equal(undefined);

          const res = await eth_sendRawTransaction([rawTx]);
          expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

          const receiptTxFee = await getTxFeeFromReceipt(res.data.result);
          const afterBalance = await queryEthBalance(wallet1.address);

          const realTxFee = prevBalance.sub(afterBalance).toBigInt();
          const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);

          // console.log({
          //   realTxFee: formatEther(realTxFee),
          //   receiptTxFee: formatEther(receiptTxFee),
          //   diffReceiptTxFee: formatEther(diffReceiptTxFee),
          // });

          expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
        });
      });
    });

    describe('call contract (transfer ACA)', () => {
      const iface = new Interface(TokenABI.abi);
      const transferAmount = parseUnits('123.321', ACA_Digits);
      const partialTransferTX = {
        chainId,
        from: wallet1.address,
        to: ADDRESS.ACA,
        data: iface.encodeFunctionData('transfer', [account2.evmAddress, transferAmount]),
        type: 0,
      };

      describe('with legacy EIP-155 signature', () => {
        it('has correct balance after transfer, and receipt\'s gas info is accurate', async () => {
          const [balance1, balance2] = await Promise.all([
            queryNativeBalance(account1.evmAddress),
            queryNativeBalance(account2.evmAddress),
          ]);

          const transferTX = {
            ...partialTransferTX,
            nonce: await getNonce(wallet1.address),
          };

          const { gasPrice, gasLimit } = await estimateGas(transferTX);
          const rawTx = await wallet1.signTransaction({
            ...transferTX,
            gasPrice,
            gasLimit,
          });

          const res = await eth_sendRawTransaction([rawTx]);
          expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

          await sleep(1000);
          const [_balance1, _balance2] = await Promise.all([
            queryNativeBalance(account1.evmAddress),
            queryNativeBalance(account2.evmAddress),
          ]);

          const receiptTxFee = await getTxFeeFromReceipt(res.data.result);
          const realTxFee = nativeToEthDecimal(balance1.sub(_balance1).sub(transferAmount).toBigInt()).toBigInt();
          const estimatedTxFee = gasPrice.mul(gasLimit).toBigInt();
          const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);
          const diffEstimateTxFee = bigIntDiff(realTxFee, estimatedTxFee);

          // console.log({
          //   estimatedTxFee: formatEther(estimatedTxFee),
          //   realTxFee: formatEther(realTxFee),
          //   receiptTxFee: formatEther(receiptTxFee),
          //   diffReceiptTxFee: formatEther(diffReceiptTxFee),
          //   diffEstimateTxFee: formatEther(diffEstimateTxFee),
          // });

          expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
          expect(diffEstimateTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
          expect(formatEther(_balance2.sub(balance2))).to.eq(formatEther(transferAmount));
        });
      });

      describe('with EIP-1559 signature', () => {
        it('throw correct error', async () => {
          const priorityFee = BigNumber.from(0);
          const transferTX = {
            ...partialTransferTX,
            nonce: await getNonce(wallet1.address),
            gasPrice: undefined,
            maxPriorityFeePerGas: priorityFee,
            maxFeePerGas: 1000000,
            type: 2,
          };

          const rawTx = await wallet1.signTransaction(transferTX);

          const res = await eth_sendRawTransaction([rawTx]);
          expect(res.data.error?.message).to.contain('unsupported transaction type: 2, please use legacy or EIP-712 instead');
        });
      });

      describe('with EIP-712 signature', () => {
        it('has correct balance after transfer, and receipt\'s gas info is accurate', async () => {
          const [balance1, balance2] = await Promise.all([
            queryEthBalance(account1.evmAddress),
            queryEthBalance(account2.evmAddress),
          ]);

          const gasLimit = BigNumber.from('210000');
          const validUntil = 10000;
          const storageLimit = 100000;

          const transferTX = {
            ...partialTransferTX,
            nonce: await getNonce(wallet1.address),
            salt: genesisHash,
            gasLimit,
            validUntil,
            storageLimit,
            type: 0x60,
          };

          const sig = signTransaction(account1.privateKey, transferTX as AcalaEvmTXPayload);
          const rawTx = serializeTransaction(transferTX as UnsignedAcalaEvmTX, sig);

          const res = await eth_sendRawTransaction([rawTx]);
          expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

          await sleep(1000);
          const [_balance1, _balance2] = await Promise.all([
            queryEthBalance(account1.evmAddress),
            queryEthBalance(account2.evmAddress),
          ]);

          const receiptTxFee = await getTxFeeFromReceipt(res.data.result);
          const realTxFee = balance1.sub(_balance1).sub(nativeToEthDecimal(transferAmount)).toBigInt();
          const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);

          // console.log({
          //   realTxFee: formatEther(realTxFee),
          //   receiptTxFee: formatEther(receiptTxFee),
          //   diffReceiptTxFee: formatEther(diffReceiptTxFee),
          // });

          expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
          expect(formatEther(_balance2.sub(balance2))).to.eq(formatEther(nativeToEthDecimal(transferAmount)));
        });
      });
    });

    describe('send native ACA token', () => {
      const transferAmount = parseEther('16.88');
      const partialNativeTransferTX = {
        chainId,
        from: wallet1.address,
        to: account2.evmAddress,
        value: transferAmount,
      };

      describe('with legacy EIP-155 signature', () => {
        it('has correct balance after transfer, and receipt\'s gas info is accurate', async () => {
          const [balance1, balance2] = await Promise.all([
            queryEthBalance(account1.evmAddress),
            queryEthBalance(account2.evmAddress),
          ]);

          const unsignedTx = {
            ...partialNativeTransferTX,
            nonce: await getNonce(wallet1.address),
          };
          const { gasPrice, gasLimit } = await estimateGas(unsignedTx);

          const rawTx = await wallet1.signTransaction({
            ...unsignedTx,
            gasPrice,
            gasLimit,
          });

          const res = await eth_sendRawTransaction([rawTx]);
          expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

          await sleep(1000);
          const [_balance1, _balance2] = await Promise.all([
            queryEthBalance(account1.evmAddress),
            queryEthBalance(account2.evmAddress),
          ]);

          const receiptTxFee = await getTxFeeFromReceipt(res.data.result);
          const realTxFee = balance1.sub(_balance1).sub(transferAmount).toBigInt();
          const estimatedTxFee = gasPrice.mul(gasLimit).toBigInt();
          const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);
          const diffEstimateTxFee = bigIntDiff(realTxFee, estimatedTxFee);

          // console.log({
          //   estimatedTxFee: formatEther(estimatedTxFee),
          //   realTxFee: formatEther(realTxFee),
          //   receiptTxFee: formatEther(receiptTxFee),
          //   diffReceiptTxFee: formatEther(diffReceiptTxFee),
          //   diffEstimateTxFee: formatEther(diffEstimateTxFee),
          // });

          expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
          expect(diffEstimateTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
          expect(formatEther(_balance2.sub(balance2))).to.eq(formatEther(transferAmount));
        });
      });

      describe('with EIP-1559 signature', () => {
        it('throw correct error', async () => {
          const transferTX = {
            ...partialNativeTransferTX,
            nonce: await getNonce(wallet1.address),
            gasPrice: undefined,
            maxPriorityFeePerGas: 0,
            maxFeePerGas: 10000000000,
            type: 2,
          };

          const rawTx = await wallet1.signTransaction(transferTX);

          const res = await eth_sendRawTransaction([rawTx]);
          expect(res.data.error?.message).to.contain('unsupported transaction type: 2, please use legacy or EIP-712 instead');
        });
      });

      describe('with EIP-712 signature', () => {
        // TODO: EIP-712 doesn't use ETH gasLimit and gasPrice, do we need to support it?
        it.skip('has correct balance after transfer', async () => {
          // const balance1 = await queryEthBalance(account1.evmAddress);
          // const balance2 = await queryEthBalance(account2.evmAddress);
          // const gasLimit = BigNumber.from('210000');
          // const validUntil = 10000;
          // const storageLimit = 100000;
          // const transferTX: AcalaEvmTX = {
          //   ...partialNativeTransferTX,
          //   ...(await estimateGas()),
          //   nonce: await getNonce(wallet1.address),
          //   salt: genesisHash,
          //   gasLimit,
          //   validUntil,
          //   storageLimit,
          //   type: 0x60
          // };
          // const sig = signTransaction(account1.privateKey, transferTX);
          // const rawTx = serializeTransaction(transferTX, sig);
          // const parsedTx = parseTransaction(rawTx);
          // const res = await eth_sendRawTransaction([rawTx]);
          // expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200
          // const txHash = res.data.result;
          // const { gasUsed, effectiveGasPrice } = (await eth_getTransactionReceipt([txHash])).data.result;
          // const calculatedTxFee = BigInt(gasUsed) * BigInt(effectiveGasPrice) / BigInt(10 ** (ETH_Digits - ACA_Digits));
          // const _balance1 = await queryEthBalance(account1.evmAddress);
          // const _balance2 = await queryEthBalance(account2.evmAddress);
          // const realTxFee = balance1.sub(_balance1).sub(transferAmount).toBigInt();
          // const diff = bigIntDiff(realTxFee, receiptTxFee);
          // expect(_balance2.sub(balance2).toBigInt()).equal(transferAmount.toBigInt());
          // expect(Number(diff)).to.lessThan(TX_FEE_OFF_TOLERANCE);
        });
      });
    });
  });

  describe('eth_call', () => {
    const callRequest = (abi: any) => async (address: string, method: string, params?: any[], blockTag?: any) => {
      const iface = new Interface(abi);

      const data = iface.encodeFunctionData(method, params);
      const block = blockTag || (await eth_blockNumber()).data.result;
      const rawRes = (await eth_call([{ to: address, data }, block])).data.result;

      return iface.decodeFunctionResult(method, rawRes);
    };

    const callToken = callRequest(TokenABI.abi);
    const callDex = callRequest(DEXABI.abi);

    it('get correct procompile token info', async () => {
      // https://github.com/AcalaNetwork/Acala/blob/a5d9e61c74/node/service/src/chain_spec/mandala.rs#L628-L636
      // Native tokens need to registry in asset_registry module.
      const tokenMetaData = [
        {
          address: '0x0000000000000000000100000000000000000000',
          name: 'Acala',
          symbol: 'ACA',
          decimals: 12,
        },
        {
          address: '0x0000000000000000000100000000000000000001',
          name: 'Acala Dollar',
          symbol: 'AUSD',
          decimals: 12,
        },
        {
          address: '0x0000000000000000000100000000000000000002',
          name: 'Polkadot',
          symbol: 'DOT',
          decimals: 10,
        },
        {
          address: '0x0000000000000000000100000000000000000003',
          name: 'Liquid DOT',
          symbol: 'LDOT',
          decimals: 10,
        },
      ];

      const tests = tokenMetaData.map(async ({ address, name, symbol, decimals }) => {
        const [_name] = await callToken(address, 'name');
        const [_symbol] = await callToken(address, 'symbol');
        const [_decimals] = await callToken(address, 'decimals');

        expect(_name).to.equal(name);
        expect(_symbol).to.equal(symbol);
        expect(_decimals).to.equal(decimals);
      });

      await Promise.all(tests);
    });

    it('supports calling historical blocks', async () => {
      const dexAddr = '0x0230135fded668a3f7894966b14f42e65da322e4'; // created at block 5
      const before = await callDex(dexAddr, 'getLiquidityPool', [ADDRESS.ACA, ADDRESS.AUSD], { blockNumber: '0x5' });
      // swap happens at block 6
      const block7Hash = (await eth_getBlockByNumber([7, false])).data.result.hash;
      const after = await callDex(dexAddr, 'getLiquidityPool', [ADDRESS.ACA, ADDRESS.AUSD], { blockHash: block7Hash });

      expect(before.map(BigInt)).to.deep.equal([1000000000000000000n, 2000000000000000000n]);
      expect(after.map(BigInt)).to.deep.equal([1000002000000000000n, 1999996004007985992n]);
    });

    it('throws correct error for invalid tag', async () => {
      const dexAddr = '0x0230135fded668a3f7894966b14f42e65da322e4';
      const data = '0x123123123';

      expect((await eth_call([{ to: dexAddr, data }, { hahaha: 13542 }])).data.error).to.deep.equal({
        code: -32602,
        message: 'invalid argument 1: invalid eip-1898 blocktag, expected to contain blockNumber or blockHash',
      });

      expect((await eth_call([{ to: dexAddr, data }, { blockHash: 123 }])).data.error).to.deep.equal({
        code: -32602,
        message: 'invalid argument 1: invalid block hash, expected type String',
      });
    });
  });

  describe('eth_getEthGas', () => {
    it('get correct default contract deployment eth gas params', async () => {
      const gasLimit = 21000000;
      const storageLimit = 64100;
      const validUntil = 1000000;

      // correspond to validUntil = 1000000
      const defaultResults1 = await Promise.all([
        eth_getEthGas([{ gasLimit, storageLimit, validUntil }]),
        eth_getEthGas([{ gasLimit, validUntil }]),
        eth_getEthGas([{ storageLimit, validUntil }]),
        eth_getEthGas([{ validUntil }]),
      ]);

      for (const res of defaultResults1) {
        const gas = res.data.result;

        expect(parseInt(gas.gasLimit, 16)).to.equal(53064000);
        expect(parseInt(gas.gasPrice)).to.equal(202184524778);
      }

      // correspond to validUntil = curBlock + 150
      const curBlock = parseInt((await eth_blockNumber()).data.result, 16);
      const expectedGasPrice = parseInt(
        (
          await eth_getEthGas([
            {
              validUntil: curBlock + 150,
            },
          ])
        ).data.result.gasPrice,
        16
      );

      const defaultResults2 = await Promise.all([
        eth_getEthGas([{ gasLimit }]),
        eth_getEthGas([{ storageLimit }]),
        eth_getEthGas([{ gasLimit, storageLimit }]),
        eth_getEthGas([{}]),
        eth_getEthGas([]),
      ]);

      for (const res of defaultResults2) {
        const gas = res.data.result;

        expect(parseInt(gas.gasLimit, 16)).to.equal(53064000);
        expect(parseInt(gas.gasPrice)).to.equal(expectedGasPrice);
      }
    });

    it('get correct custom eth gas params', async () => {
      const gasLimit = 12345678;
      const storageLimit = 30000;
      const validUntil = 876543;

      const gas = (await eth_getEthGas([{ gasLimit, storageLimit, validUntil }])).data.result;

      expect(parseInt(gas.gasLimit, 16)).to.equal(27353678);
      expect(parseInt(gas.gasPrice)).to.equal(201914843605);
    });

    it('throws error when params are not valid', async () => {
      const res = await eth_getEthGas([{ anyParam: 12345 }]);

      expect(res.data.error.code).to.equal(-32602);
      expect(res.data.error.message).to.contain('parameter can only be \'storageLimit\' | \'gasLimit\' | \'validUntil\'');
    });
  });

  describe('eth_getCode', () => {
    const preCompileAddresses = [
      '0x0000000000000000000100000000000000000001', // AUSD
      '0x0000000000000000000200000000000000000001', // LP_ACA_AUSD
      '0x0000000000000000000000000000000000000803', // DEX
    ];

    const tags = ['latest', 'earliest', 'finalized', 'safe'];

    it('get correct precompile token code', async () => {
      for (const addr of preCompileAddresses) {
        for (const t of tags) {
          const res = (await eth_getCode([addr, t])).data.result;
          expect(res.length).to.greaterThan(2);
        }
      }
    });

    it.skip('get correct user deployed contract code', async () => {});

    it('returns empty for pending tag or non-exist contract address', async () => {
      const randAddr = '0x1ebEc3D7fd088d9eE4B6d8272788f028e5122218';
      for (const t of [...tags, 'pending']) {
        const res = (await eth_getCode([randAddr, t])).data.result;
        expect(res).to.equal('0x');
      }
    });

    it('supports calling historical blocks', async () => {
      const dexAddr = '0x0230135fded668a3f7894966b14f42e65da322e4'; // created at block 5
      expect((await eth_getCode([dexAddr, { blockNumber: 1 }])).data.result).to.equal('0x');
      expect((await eth_getCode([dexAddr, { blockNumber: 5 }])).data.result.length).to.greaterThan(2);
      expect((await eth_getCode([dexAddr, { blockNumber: 8 }])).data.result.length).to.greaterThan(2);
      expect((await eth_getCode([dexAddr, 7])).data.result.length).to.greaterThan(2);
    });
  });

  describe('eth_getEthResources', () => {
    it('get correct gas', async () => {
      const rawRes = (
        await eth_getEthResources([
          {
            from: '0xd2a5c8867d1b3665fb3b2d93d514bd1c73bb2227',
            to: '0x4e3e1108e86c3fafb389629e99bff9c4fa911e54',
            data: '0x',
          },
        ])
      ).data.result;
      expect(rawRes.gasPrice).to.equal('0x2e90f20000');
      expect(rawRes.gasLimit).to.equal('0x6270');
    });
  });

  describe('net_runtimeVersion', () => {
    it('get correct runtime version', async () => {
      const version = (await net_runtimeVersion([])).data.result;

      expect(version).to.be.gt(2000);
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

      const block1818188NotFull = karuraBlock1818188;

      expect(resFull).to.deep.equal(karuraBlock1818188);
      expect(res).to.deep.equal(block1818188NotFull);
    });

    it('when there are 1 EVM transactions', async () => {
      const resFull = (await eth_getBlockByNumber_karura([1818518, true])).data.result;
      const res = (await eth_getBlockByNumber_karura([1818518, false])).data.result;

      const block1818518NotFull = { ...karuraBlock1818518 };
      block1818518NotFull.transactions = karuraBlock1818518.transactions.map((t) => t.hash) as any;

      expect(resFull).to.deep.equal(karuraBlock1818518);
      expect(res).to.deep.equal(block1818518NotFull);
    });

    it('when there are >= 2 EVM transactions', async () => {
      const resFull = (await eth_getBlockByNumber_karura([2449983, true])).data.result;
      const res = (await eth_getBlockByNumber_karura([2449983, false])).data.result;

      const block2449983NotFull = { ...karuraBlock2449983 };
      block2449983NotFull.transactions = karuraBlock2449983.transactions.map((t) => t.hash) as any;

      expect(resFull).to.deep.equal(karuraBlock2449983);
      expect(res).to.deep.equal(block2449983NotFull);
    });
  });

  describe('eth_getBalance', () => {
    it('get correct balance', async () => {
      const block8Balance = 8999995192389995117000000n; // edit me for different mandala version
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

  describe('eth_subscribe', () => {
    const provider = new EvmRpcProvider(NODE_RPC_URL);
    const aca = new Contract(ADDRESS.ACA, TokenABI.abi, wallet1.connect(provider));

    const notifications: any[] = [];
    let subId0;
    let subId1;
    let subId2;
    let subId3;
    let ws: WebSocket;

    beforeAll(() => {
      // these has to be in <before block>, since everything outside of <before block> will be globally executed before any <before block>
      // also, instantiating ws (next line) has to be inside <before block>, otherwise there will be mysterious failure...
      ws = new WebSocket(WS_URL);
      ws.on('open', () => {
        ws.on('message', (data) => {
          const parsedData = JSON.parse(data.toString());
          notifications.push(parsedData);
        });

        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 0,
            method: 'eth_subscribe',
            params: ['newHeads'],
          })
        );

        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_subscribe',
            params: ['logs', {}],
          })
        );

        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_subscribe',
            params: [
              'logs',
              {
                topics: [
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // transfer
                  null,
                  ['0x000000000000000000000000b00cb924ae22b2bbb15e10c17258d6a2af980421'],
                ],
              },
            ],
          })
        );

        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'eth_subscribe',
            params: [
              'logs',
              {
                topics: [
                  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aaaaaaaaaaa', // shouldn't match
                ],
              },
            ],
          })
        );
      });
    });

    afterAll(async () => {
      await provider.disconnect();
      ws.close();
    });

    it('get correct subscrption notification', async () => {
      await provider.isReady();
      await aca.transfer(evmAccounts[1].evmAddress, 111222333444555);

      await sleep(3000); // give ws some time to notify

      subId0 = notifications.find((n) => n.id === 0).result;
      subId1 = notifications.find((n) => n.id === 1).result;
      subId2 = notifications.find((n) => n.id === 2).result;
      subId3 = notifications.find((n) => n.id === 3).result;

      const notification0 = notifications.find((n) => n.params?.subscription === subId0); // new block
      const notification1 = notifications.find((n) => n.params?.subscription === subId1); // ACA transfer
      const notification2 = notifications.find((n) => n.params?.subscription === subId2); // ACA transfer
      const notification3 = notifications.find((n) => n.params?.subscription === subId3); // no match

      const curBlock = (await eth_blockNumber()).data.result;
      const curBlockInfo = (await eth_getBlockByNumber([curBlock, false])).data.result;

      expect(notification0).to.deep.contains({
        jsonrpc: '2.0',
        method: 'eth_subscription',
        params: {
          subscription: subId0,
          result: curBlockInfo,
        },
      });

      await sleep(10000); // give subql some time to index
      const expectedLog = (
        await eth_getLogs([
          {
            blockHash: curBlockInfo.hash,
          },
        ])
      ).data.result;

      expect(expectedLog.length).to.equal(1);
      delete (expectedLog[0] as any).removed;

      expect(notification1).to.deep.contains({
        jsonrpc: '2.0',
        method: 'eth_subscription',
        params: {
          subscription: subId1,
          result: expectedLog[0],
        },
      });

      expect(notification2).to.deep.contains({
        jsonrpc: '2.0',
        method: 'eth_subscription',
        params: {
          subscription: subId2,
          result: expectedLog[0],
        },
      });

      expect(notification3).to.equal(undefined);
    });

    it('unsubscribe works', async () => {
      notifications.length = 0;

      let reqId = 10;
      const unsubscribe = async (id: string) => {
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: reqId++,
            method: 'eth_unsubscribe',
            params: [id],
          })
        );

        await sleep(300); // delay each msg to make sure result order is correct
      };

      await unsubscribe(subId0);
      await unsubscribe(subId1);
      await unsubscribe(subId3);
      await unsubscribe(Wallet.createRandom().address);

      await sleep(3000); // give ws some time to notify

      expect(notifications).to.deep.equal([
        { id: 10, jsonrpc: '2.0', result: true },
        { id: 11, jsonrpc: '2.0', result: true },
        { id: 12, jsonrpc: '2.0', result: true },
        { id: 13, jsonrpc: '2.0', result: false },
      ]);

      // only sub2 is left
      notifications.length = 0;
      await aca.transfer(evmAccounts[1].evmAddress, 1234567654321);

      await sleep(10000); // give ws some time to notify

      const notification0 = notifications.find((n) => n.params?.subscription === subId0); // no match
      const notification1 = notifications.find((n) => n.params?.subscription === subId1); // no match
      const notification2 = notifications.find((n) => n.params?.subscription === subId2); // ACA transfer
      const notification3 = notifications.find((n) => n.params?.subscription === subId3); // no match

      // after unsubscribe they should not be notified anymore
      expect(notification0).to.equal(undefined);
      expect(notification1).to.equal(undefined);
      expect(notification3).to.equal(undefined);

      await sleep(10000); // give subql some time to index
      const curBlock = (await eth_blockNumber()).data.result;
      const curBlockInfo = (await eth_getBlockByNumber([curBlock, false])).data.result;
      const expectedLog = (
        await eth_getLogs([
          {
            blockHash: curBlockInfo.hash,
          },
        ])
      ).data.result;

      expect(expectedLog.length).to.equal(1);
      delete (expectedLog[0] as any).removed;

      expect(notification2).to.deep.contains({
        jsonrpc: '2.0',
        method: 'eth_subscription',
        params: {
          subscription: subId2,
          result: expectedLog[0],
        },
      });
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

      const curBlockNum = Number((await eth_blockNumber()).data.result);
      expectedLogs = (
        await eth_getLogs([
          {
            fromBlock: curBlockNum - txCount,
            toBlock: curBlockNum,
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

      const curBlockNum = Number((await eth_blockNumber()).data.result);
      expectedLogs = (
        await eth_getLogs([
          {
            fromBlock: curBlockNum - txCount,
            toBlock: curBlockNum,
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

  describe('finalized blocktag', () => {
    /* ----------
      latest block <=> finalized block in local setup
                                            ---------- */
    it('eth_getTransactionCount', async () => {
      const res = (await eth_getTransactionCount([ADDRESS_ALICE, 'latest'])).data.result;
      const resF = (await eth_getTransactionCount([ADDRESS_ALICE, 'finalized'])).data.result;
      const resS = (await eth_getTransactionCount([ADDRESS_ALICE, 'safe'])).data.result;

      expect(parseInt(res)).to.greaterThan(0);
      expect(res).to.equal(resF);
      expect(res).to.equal(resS);
    });

    it('eth_getCode', async () => {
      const res = (await eth_getCode([DETERMINISTIC_SETUP_DEX_ADDRESS, 'latest'])).data.result;
      const resF = (await eth_getCode([DETERMINISTIC_SETUP_DEX_ADDRESS, 'finalized'])).data.result;
      const resS = (await eth_getCode([DETERMINISTIC_SETUP_DEX_ADDRESS, 'safe'])).data.result;

      expect(res).not.to.be.undefined;
      expect(res).to.equal(resF);
      expect(res).to.equal(resS);
    });

    it('eth_getBalance', async () => {
      const res = (await eth_getBalance([ADDRESS_ALICE, 'latest'])).data.result;
      const resF = (await eth_getBalance([ADDRESS_ALICE, 'finalized'])).data.result;
      const resS = (await eth_getBalance([ADDRESS_ALICE, 'safe'])).data.result;

      expect(parseInt(res)).to.greaterThan(0);
      expect(res).to.equal(resF);
      expect(res).to.equal(resS);
    });

    it('eth_getBlockByNumber', async () => {
      const res = (await eth_getBlockByNumber(['latest', false])).data.result;
      const resF = (await eth_getBlockByNumber(['finalized', false])).data.result;
      const resS = (await eth_getBlockByNumber(['safe', false])).data.result;

      expect(res).not.to.be.undefined;
      expect(res).to.deep.equal(resF);
      expect(res).to.deep.equal(resS);
    });

    it('eth_isBlockFinalized', async () => {
      const res = (await eth_isBlockFinalized(['latest'])).data.result;
      const resF = (await eth_isBlockFinalized(['finalized'])).data.result;
      const resS = (await eth_isBlockFinalized(['safe'])).data.result;

      expect(res).to.equal(true);
      expect(res).to.deep.equal(resF);
      expect(res).to.deep.equal(resS);
    });

    // don't care about these
    it.skip('eth_getBlockTransactionCountByNumber', async () => {});
    it.skip('eth_getTransactionByBlockNumberAndIndex', async () => {});
    it.skip('eth_getUncleCountByBlockNumber', async () => {});
    it.skip('eth_getUncleByBlockNumberAndIndex', async () => {});

    // too lazy to test these
    it.skip('eth_call', async () => {});
    it.skip('eth_getStorageAt', async () => {});
  });

  describe('net_listening', () => {
    it('returns true', async () => {
      const res = (await net_listening([])).data.result;
      expect(res).to.deep.equal(true);
    });
  });
});
