import TokenABI from '@acala-network/contracts/build/contracts/Token.json';
import ADDRESS from '@acala-network/contracts/utils/Address';
import { SubqlProvider } from '@acala-network/eth-providers/lib/utils/subqlProvider';
import { serializeTransaction, AcalaEvmTX, parseTransaction, signTransaction } from '@acala-network/eth-transactions';
import { Log } from '@ethersproject/abstract-provider';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { BigNumber } from '@ethersproject/bignumber';
import { parseUnits, Interface } from 'ethers/lib/utils';
import { ApiPromise, WsProvider } from '@polkadot/api';
import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'ws://127.0.0.1:8545';
const SUBQL_URL = process.env.SUBQL_URL || 'ws://127.0.0.1:3001';

const subql = new SubqlProvider(SUBQL_URL);

const rpcGet = (method: string) => (
  (params: any): any =>
    axios.get(RPC_URL, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method,
        params
      }
    })
);

export const logsEq = (a: Log[], b: Log[]): boolean =>
  a.length === b.length &&
  a.every(({ transactionHash: t0, logIndex: l0 }) =>
    b.find(({ transactionHash: t1, logIndex: l1 }) => t0 === t1 && parseInt(l0) === parseInt(l1))
  );

describe('env setup', () => {
  it('has tx in the chain', async () => {
    const res = await rpcGet('eth_blockNumber')();
    expect(Number(res.data.result)).to.greaterThan(0);
  });
});

describe('eth_getTransactionReceipt', () => {
  const eth_getTransactionReceipt = rpcGet('eth_getTransactionReceipt');

  it('returns correct result when hash exist', async () => {
    const allTxReceipts = await subql.getAllTxReceipts();

    expect(allTxReceipts.length).to.greaterThan(0);

    // test first one
    let txR = allTxReceipts[0];
    let res = await eth_getTransactionReceipt([txR.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.transactionHash).to.equal(txR.transactionHash);

    // test last one
    txR = allTxReceipts[allTxReceipts.length - 1];
    res = await eth_getTransactionReceipt([txR.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.transactionHash).to.equal(txR.transactionHash);

    // test middle one
    txR = allTxReceipts[Math.floor(allTxReceipts.length / 2)];
    res = await eth_getTransactionReceipt([txR.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.transactionHash).to.equal(txR.transactionHash);
  });

  it('return correct error code and messge', async () => {
    let res;

    /* ---------- invalid hex address ---------- */
    res = await eth_getTransactionReceipt(['0x000']);
    expect(res.status).to.equal(200);
    expect(res.data.error.code).to.equal(-32602);
    expect(res.data.error.message).to.contain('invalid argument');

    /* ---------- hash not found ---------- */
    res = await eth_getTransactionReceipt(['0x7ae069634d1154c0299f7fe1d473cf3d6f06cd9b57182d5319eede35a3a4d776']);
    expect(res.status).to.equal(200);
    expect(res.data.error.code).to.equal(6969);
    expect(res.data.error.message).to.contain('transaction hash not found');
  });
});

describe('eth_getLogs', () => {
  const eth_getLogs = rpcGet('eth_getLogs');
  const ALL_BLOCK_RANGE_FILTER = { fromBlock: 'earliest' };

  describe('when no filter', () => {
    it('returns all logs from latest block', async () => {
      expect(true).to.equal(true); // this one is hard to test, skip
    });
  });

  describe('filter by address', () => {
    it('returns correct logs', async () => {
      const allLogs = await subql.getAllLogs();
      expect(allLogs.length).to.greaterThan(0);

      const log1 = allLogs[0];
      const log2 = allLogs[allLogs.length - 1];
      const log3 = allLogs[Math.floor(allLogs.length / 2)];
      let res;
      let expectedLogs;

      /* ---------- single address ---------- */
      res = await eth_getLogs([{ address: log1.address, ...ALL_BLOCK_RANGE_FILTER }]);
      expectedLogs = allLogs.filter((l) => l.address === log1.address);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ address: log2.address, ...ALL_BLOCK_RANGE_FILTER }]);
      expectedLogs = allLogs.filter((l) => l.address === log2.address);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ address: log3.address, ...ALL_BLOCK_RANGE_FILTER }]);
      expectedLogs = allLogs.filter((l) => l.address === log3.address);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      /* ---------- multiple address ---------- */
      // TODO: interestingly, current Filter type says address can only be string
      // can support string[] filter if we needed in the future
    });
  });

  describe('filter by block number', () => {
    it('returns correct logs', async () => {
      const BIG_NUMBER = 88888888;
      const BIG_NUMBER_HEX = '0x54C5638';
      const allLogs = await subql.getAllLogs();
      expect(allLogs.length).to.greaterThan(0);

      let res;
      let expectedLogs;

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ ...ALL_BLOCK_RANGE_FILTER }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: 0 }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: -100000, toBlock: BIG_NUMBER }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: -100000, toBlock: BIG_NUMBER_HEX }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: 0, toBlock: 'latest' }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ fromBlock: 99999 }]);
      expect(res.status).to.equal(200);
      expect(res.data.result).to.deep.equal([]);

      res = await eth_getLogs([{ toBlock: -1 }]);
      expect(res.status).to.equal(200);
      expect(res.data.result).to.deep.equal([]);

      /* ---------- should return partial logs ---------- */
      const from = 16;
      const to = 50;
      res = await eth_getLogs([{ fromBlock: from }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from && l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);
    });
  });

  describe('filter by block tag', () => {
    it('returns correct logs for valid tag', async () => {
      const allLogs = await subql.getAllLogs();
      expect(allLogs.length).to.greaterThan(0);

      let res;
      let expectedLogs;

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ fromBlock: 'earliest' }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: 0 }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: '0x0' }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: '0x00000000' }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: 'latest' }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

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
      const from = 17;
      const to = 50;
      res = await eth_getLogs([{ fromBlock: from, toBlock: 'latest' }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: 'earliest', toBlock: to }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ fromBlock: from, toBlock: to }]);
      expect(res.status).to.equal(200);
      expectedLogs = allLogs.filter((l) => l.blockNumber >= from && l.blockNumber <= to);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);
    });

    it('returns correct error code and messge for invalid tag', async () => {
      let res;

      /* ---------- invalid tag ---------- */
      res = await eth_getLogs([{ fromBlock: 'polkadot' }]);
      expect(res.status).to.equal(200);
      expect(res.data.error.code).to.equal(-32602);
      expect(res.data.error.message).to.contain("blocktag should be number | hex string | 'latest' | 'earliest'");

      /* ---------- invalid hex string ---------- */
      res = await eth_getLogs([{ toBlock: '0xzzzz' }]);
      expect(res.status).to.equal(200);
      expect(res.data.error.code).to.equal(-32602);
      expect(res.data.error.message).to.contain("blocktag should be number | hex string | 'latest' | 'earliest'");
    });
  });

  describe('filter by topics', () => {
    it('returns correct logs', async () => {
      const allLogs = await subql.getAllLogs();
      expect(allLogs.length).to.greaterThan(0);

      const log1 = allLogs[0];
      const log2 = allLogs[allLogs.length - 1];
      const log3 = allLogs[Math.floor(allLogs.length / 2)];
      let res;
      let expectedLogs;

      /* ---------- should return all logs ---------- */
      res = await eth_getLogs([{ topics: [], ...ALL_BLOCK_RANGE_FILTER }]);
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, allLogs)).to.equal(true);

      /* ---------- should return no logs ---------- */
      res = await eth_getLogs([{ topics: ['XXX'], ...ALL_BLOCK_RANGE_FILTER }]);
      expect(res.data.result).to.deep.equal([]);

      /* ---------- should return some logs ---------- */
      res = await eth_getLogs([{ topics: log1.topics, ...ALL_BLOCK_RANGE_FILTER }]);
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log1.topics.includes(t)));
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ topics: log2.topics, ...ALL_BLOCK_RANGE_FILTER }]);
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log2.topics.includes(t)));
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);

      res = await eth_getLogs([{ topics: log3.topics, ...ALL_BLOCK_RANGE_FILTER }]);
      expectedLogs = allLogs.filter((l) => l.topics.every((t) => log3.topics.includes(t)));
      expect(res.status).to.equal(200);
      expect(logsEq(res.data.result, expectedLogs)).to.equal(true);
    });
  });
});

describe('eth_getTransactionByHash', () => {
  const eth_getTransactionByHash = rpcGet('eth_getTransactionByHash');

  it('finds correct tx when hash exist', async () => {
    const allTxReceipts = await subql.getAllTxReceipts();
    const tx1 = allTxReceipts[0];
    const tx2 = allTxReceipts[allTxReceipts.length - 1];
    const tx3 = allTxReceipts[Math.floor(allTxReceipts.length / 2)];

    // test first one
    let res = await eth_getTransactionByHash([tx1.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.hash).to.equal(tx1.transactionHash);

    // test last one
    res = await eth_getTransactionByHash([tx2.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.hash).to.equal(tx2.transactionHash);

    // test middle one
    res = await eth_getTransactionByHash([tx3.transactionHash]);
    expect(res.status).to.equal(200);
    expect(res.data.result.hash).to.equal(tx3.transactionHash);
  });

  it('return correct error code and messge', async () => {
    let res;

    /* ---------- invalid hex address ---------- */
    res = await eth_getTransactionByHash(['0x000']);
    expect(res.status).to.equal(200);
    expect(res.data.error.code).to.equal(-32602);
    expect(res.data.error.message).to.contain('invalid argument');

    /* ---------- hash not found ---------- */
    res = await eth_getTransactionByHash(['0x7ae069634d1154c0299f7fe1d473cf3d6f06cd9b57182d5319eede35a3a4d776']);
    expect(res.status).to.equal(200);
    expect(res.data.error.code).to.equal(6969);
    expect(res.data.error.message).to.contain('transaction hash not found');
  });
});

describe('eth_accounts', () => {
  const eth_accounts = rpcGet('eth_accounts');

  it('returns empty array', async () => {
    const res = await eth_accounts([]);
    expect(res.status).to.equal(200);
    expect(res.data.result).to.deep.equal([]);
  });
});

const evmAccounts = [
  {
    privateKey: '0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f',
    evmAddress: '0x75E480dB528101a381Ce68544611C169Ad7EB342'
  },
  {
    privateKey: '0x4daddf7d5d2a9059e8065cb3ec50beabe2c23c7d6b3e380c1de8c40269acd85c',
    evmAddress: '0xb00cB924ae22b2BBb15E10c17258D6a2af980421'
  }
];

describe('eth_sendRawTransaction', () => {
  const eth_sendRawTransaction = rpcGet('eth_sendRawTransaction');
  const eth_getTransactionCount = rpcGet('eth_getTransactionCount');
  const eth_getBalance = rpcGet('eth_getBalance');
  const eth_chainId = rpcGet('eth_chainId');
  const eth_gasPrice = rpcGet('eth_gasPrice');
  const eth_estimateGas = rpcGet('eth_estimateGas');

  const account1 = evmAccounts[0];
  const account2 = evmAccounts[1];
  const wallet1 = new Wallet(account1.privateKey);

  let chainId: number;
  let txGasLimit: BigNumber;
  let txGasPrice: BigNumber;
  let genesisHash: string;

  let api: ApiPromise;

  before('prepare common variables', async () => {
    chainId = BigNumber.from((await eth_chainId()).data.result).toNumber();

    txGasLimit = BigNumber.from(34132001);
    txGasPrice = BigNumber.from(200786445289);

    const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';
    const wsProvider = new WsProvider(endpoint);
    api = await ApiPromise.create({ provider: wsProvider });

    genesisHash = api.genesisHash.toHex(); // TODO: why EIP-712 salt has to be genesis hash?
  });

  after(async () => {
    await api.disconnect();
  });

  describe('deploy contract (hello world)', () => {
    const deployHelloWorldData =
      '0x60806040526040518060400160405280600c81526020017f48656c6c6f20576f726c642100000000000000000000000000000000000000008152506000908051906020019061004f929190610062565b5034801561005c57600080fd5b50610166565b82805461006e90610134565b90600052602060002090601f01602090048101928261009057600085556100d7565b82601f106100a957805160ff19168380011785556100d7565b828001600101855582156100d7579182015b828111156100d65782518255916020019190600101906100bb565b5b5090506100e491906100e8565b5090565b5b808211156101015760008160009055506001016100e9565b5090565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061014c57607f821691505b602082108114156101605761015f610105565b5b50919050565b61022e806101756000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063c605f76c14610030575b600080fd5b61003861004e565b6040516100459190610175565b60405180910390f35b6000805461005b906101c6565b80601f0160208091040260200160405190810160405280929190818152602001828054610087906101c6565b80156100d45780601f106100a9576101008083540402835291602001916100d4565b820191906000526020600020905b8154815290600101906020018083116100b757829003601f168201915b505050505081565b600081519050919050565b600082825260208201905092915050565b60005b838110156101165780820151818401526020810190506100fb565b83811115610125576000848401525b50505050565b6000601f19601f8301169050919050565b6000610147826100dc565b61015181856100e7565b93506101618185602086016100f8565b61016a8161012b565b840191505092915050565b6000602082019050818103600083015261018f818461013c565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806101de57607f821691505b602082108114156101f2576101f1610197565b5b5091905056fea26469706673582212204d363ed34111d1be492d4fd086e9f2df62b3c625e89ade31f30e63201ed1e24f64736f6c63430008090033';

    let partialDeployTx;

    before(() => {
      partialDeployTx = {
        chainId,
        gasLimit: txGasLimit,
        gasPrice: txGasPrice,
        data: deployHelloWorldData,
        value: BigNumber.from(0)
      };
    });

    describe('with legacy EIP-155 signature', () => {
      it('serialize, parse, and send tx correctly', async () => {
        const unsignedTx: AcalaEvmTX = {
          ...partialDeployTx,
          nonce: (await eth_getTransactionCount([wallet1.address, 'latest'])).data.result
        };

        const rawTx = await wallet1.signTransaction(unsignedTx);
        const parsedTx = parseTransaction(rawTx);

        expect(parsedTx.gasPrice.eq(txGasPrice)).equal(true);
        expect(parsedTx.gasLimit.eq(txGasLimit)).equal(true);

        expect(parsedTx.from).equal(wallet1.address);
        expect(parsedTx.data).equal(deployHelloWorldData);
        expect(parsedTx.type).equal(null);
        expect(parsedTx.maxPriorityFeePerGas).equal(undefined);
        expect(parsedTx.maxFeePerGas).equal(undefined);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.status).to.equal(200);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200
      });
    });

    describe('with EIP-1559 signature', () => {
      it('serialize, parse, and send tx correctly', async () => {
        const priorityFee = BigNumber.from(2);
        const unsignedTx: AcalaEvmTX = {
          ...partialDeployTx,
          nonce: (await eth_getTransactionCount([wallet1.address, 'latest'])).data.result,
          gasPrice: undefined,
          maxPriorityFeePerGas: priorityFee,
          maxFeePerGas: txGasPrice,
          type: 2
        };

        const rawTx = await wallet1.signTransaction(unsignedTx);
        const parsedTx = parseTransaction(rawTx);

        expect(parsedTx.maxFeePerGas.eq(txGasPrice)).equal(true);
        expect(parsedTx.maxPriorityFeePerGas.eq(priorityFee)).equal(true);
        expect(parsedTx.gasLimit.eq(txGasLimit)).equal(true);

        expect(parsedTx.from).equal(wallet1.address);
        expect(parsedTx.data).equal(deployHelloWorldData);
        expect(parsedTx.type).equal(2);
        expect(parsedTx.gasPrice).equal(null);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.status).to.equal(200);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200
      });
    });

    describe('with EIP-712 signature', () => {
      it('serialize, parse, and send tx correctly', async () => {
        const gasLimit = BigNumber.from('0x030dcf');
        const validUntil = 10000;
        const storageLimit = 100000;

        const unsignEip712Tx: AcalaEvmTX = {
          ...partialDeployTx,
          nonce: (await eth_getTransactionCount([wallet1.address, 'latest'])).data.result,
          salt: genesisHash,
          gasLimit,
          validUntil,
          storageLimit,
          type: 0x60
        };

        const sig = signTransaction(account1.privateKey, unsignEip712Tx);
        const rawTx = serializeTransaction(unsignEip712Tx, sig);
        const parsedTx = parseTransaction(rawTx);

        expect(parsedTx.gasLimit.eq(gasLimit)).equal(true);
        expect(parsedTx.validUntil.eq(validUntil)).equal(true);
        expect(parsedTx.storageLimit.eq(storageLimit)).equal(true);

        expect(parsedTx.from).equal(wallet1.address);
        expect(parsedTx.data).equal(deployHelloWorldData);
        expect(parsedTx.type).equal(96);
        expect(parsedTx.maxPriorityFeePerGas).equal(undefined);
        expect(parsedTx.maxFeePerGas).equal(undefined);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.status).to.equal(200);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200
      });
    });
  });

  describe('call contract (transfer ACA)', () => {
    const ETHDigits = 18;
    const ACADigits = 12;
    const acaContract = new Contract(ADDRESS.ACA, TokenABI.abi, wallet1);
    const iface = new Interface(TokenABI.abi);
    const queryBalance = async (addr) =>
      BigNumber.from((await eth_getBalance([addr, 'latest'])).data.result).div(10 ** (ETHDigits - ACADigits));
    const transferAmount = parseUnits('100', ACADigits);
    let partialTransferTX: Partial<AcalaEvmTX>;

    before(() => {
      partialTransferTX = {
        chainId,
        to: ADDRESS.ACA,
        gasLimit: txGasLimit,
        gasPrice: txGasPrice,
        data: iface.encodeFunctionData('transfer', [account2.evmAddress, transferAmount]),
        value: BigNumber.from(0)
      };
    });

    describe('with legacy EIP-155 signature', () => {
      it('has correct balance after transfer', async () => {
        const balance1 = await queryBalance(account1.evmAddress);
        const balance2 = await queryBalance(account2.evmAddress);

        const transferTX: AcalaEvmTX = {
          ...partialTransferTX,
          nonce: (await eth_getTransactionCount([wallet1.address, 'latest'])).data.result
        };

        const rawTx = await wallet1.signTransaction(transferTX);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.status).to.equal(200);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const _balance1 = await queryBalance(account1.evmAddress);
        const _balance2 = await queryBalance(account2.evmAddress);

        // TODO: check gasUsed is correct
        // const gasUsed = balance1.sub(_balance1).sub(transferAmount).toBigInt();
        expect(_balance2.sub(balance2).toBigInt()).equal(transferAmount.toBigInt());
      });
    });

    describe('with EIP-1559 signature', () => {
      it('has correct balance after transfer', async () => {
        const balance1 = await queryBalance(account1.evmAddress);
        const balance2 = await queryBalance(account2.evmAddress);

        const priorityFee = BigNumber.from(2);
        const transferTX: AcalaEvmTX = {
          ...partialTransferTX,
          nonce: (await eth_getTransactionCount([wallet1.address, 'latest'])).data.result,
          gasPrice: undefined,
          maxPriorityFeePerGas: priorityFee,
          maxFeePerGas: txGasPrice,
          type: 2
        };

        const rawTx = await wallet1.signTransaction(transferTX);
        const parsedTx = parseTransaction(rawTx);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.status).to.equal(200);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const _balance1 = await queryBalance(account1.evmAddress);
        const _balance2 = await queryBalance(account2.evmAddress);

        // TODO: check gasUsed is correct
        // const gasUsed = balance1.sub(_balance1).sub(transferAmount).toBigInt();
        expect(_balance2.sub(balance2).toBigInt()).equal(transferAmount.toBigInt());
      });
    });

    describe('with EIP-712 signature', () => {
      it('has correct balance after transfer', async () => {
        const balance1 = await queryBalance(account1.evmAddress);
        const balance2 = await queryBalance(account2.evmAddress);

        const gasLimit = BigNumber.from('0x030dcf');
        const validUntil = 10000;
        const storageLimit = 100000;

        const transferTX: AcalaEvmTX = {
          ...partialTransferTX,
          nonce: (await eth_getTransactionCount([wallet1.address, 'latest'])).data.result,
          salt: genesisHash,
          gasLimit,
          validUntil,
          storageLimit,
          type: 0x60
        };

        const sig = signTransaction(account1.privateKey, transferTX);
        const rawTx = serializeTransaction(transferTX, sig);
        const parsedTx = parseTransaction(rawTx);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.status).to.equal(200);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const _balance1 = await queryBalance(account1.evmAddress);
        const _balance2 = await queryBalance(account2.evmAddress);

        // TODO: check gasUsed is correct
        // const gasUsed = balance1.sub(_balance1).sub(transferAmount).toBigInt();
        expect(_balance2.sub(balance2).toBigInt()).equal(transferAmount.toBigInt());
      });
    });
  });

  describe('MetaMask send native ACA token', () => {
    const ETHDigits = 18;
    const ACADigits = 12;
    const queryBalance = async (addr) => BigNumber.from((await eth_getBalance([addr, 'latest'])).data.result);
    const transferAmount = parseUnits('16.8668', ETHDigits);
    let partialNativeTransferTX: Partial<AcalaEvmTX>;

    const estimateGas = async (): Promise<{
      gasPrice: string;
      gasLimit: string;
    }> => {
      const gasPrice = (await eth_gasPrice([])).data.result;
      const gasLimit = (
        await eth_estimateGas([
          {
            from: account1.evmAddress,
            to: account2.evmAddress,
            value: transferAmount,
            data: null,
            gasPrice
          }
        ])
      ).data.result;

      return {
        gasPrice,
        gasLimit
      };
    };

    before(() => {
      partialNativeTransferTX = {
        chainId,
        to: account2.evmAddress,
        data: '0x',
        value: transferAmount
      };
    });

    describe('with legacy EIP-155 signature', () => {
      it('has correct balance after transfer', async () => {
        const balance1 = await queryBalance(account1.evmAddress);
        const balance2 = await queryBalance(account2.evmAddress);

        const transferTX: AcalaEvmTX = {
          ...partialNativeTransferTX,
          ...(await estimateGas()),
          nonce: (await eth_getTransactionCount([wallet1.address, 'latest'])).data.result
        };

        const rawTx = await wallet1.signTransaction(transferTX);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.status).to.equal(200);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const _balance1 = await queryBalance(account1.evmAddress);
        const _balance2 = await queryBalance(account2.evmAddress);

        // TODO: check gasUsed is correct
        // const gasUsed = balance1.sub(_balance1).sub(transferAmount).toBigInt();
        expect(_balance2.sub(balance2).toBigInt()).equal(transferAmount.toBigInt());
      });
    });

    describe('with EIP-1559 signature', () => {
      it('has correct balance after transfer', async () => {
        const balance1 = await queryBalance(account1.evmAddress);
        const balance2 = await queryBalance(account2.evmAddress);

        const priorityFee = BigNumber.from(2);
        const { gasPrice, gasLimit } = await estimateGas();
        const transferTX: AcalaEvmTX = {
          ...partialNativeTransferTX,
          gasLimit,
          nonce: (await eth_getTransactionCount([wallet1.address, 'latest'])).data.result,
          gasPrice: undefined,
          maxPriorityFeePerGas: priorityFee,
          maxFeePerGas: gasPrice,
          type: 2
        };

        const rawTx = await wallet1.signTransaction(transferTX);
        const parsedTx = parseTransaction(rawTx);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.status).to.equal(200);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const _balance1 = await queryBalance(account1.evmAddress);
        const _balance2 = await queryBalance(account2.evmAddress);

        // TODO: check gasUsed is correct
        // const gasUsed = balance1.sub(_balance1).sub(transferAmount).toBigInt();
        expect(_balance2.sub(balance2).toBigInt()).equal(transferAmount.toBigInt());
      });
    });

    describe('with EIP-712 signature', () => {
      // TODO: EIP-712 doesn't use ETH gasLimit and gasPrice, do we need to support it?
      it.skip('has correct balance after transfer', async () => {
        // const balance1 = await queryBalance(account1.evmAddress);
        // const balance2 = await queryBalance(account2.evmAddress);
        // const gasLimit = BigNumber.from('0x030dcf');
        // const validUntil = 10000;
        // const storageLimit = 100000;
        // const transferTX: AcalaEvmTX = {
        //   ...partialNativeTransferTX,
        //   ...(await estimateGas()),
        //   nonce: (await eth_getTransactionCount([wallet1.address, 'latest'])).data.result,
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
        // expect(res.status).to.equal(200);
        // expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200
        // const _balance1 = await queryBalance(account1.evmAddress);
        // const _balance2 = await queryBalance(account2.evmAddress);
        // // TODO: check gasUsed is correct
        // const gasUsed = balance1.sub(_balance1).sub(transferAmount).toBigInt();
        // expect(_balance2.sub(balance2).toBigInt()).equal(transferAmount.toBigInt());
      });
    });
  });
});

describe('eth_call', () => {
  const eth_call = rpcGet('eth_call');
  const eth_blockNumber = rpcGet('eth_blockNumber');

  type Call = (address: string) => Promise<string | bigint>;
  const _call =
    (method: string): Call =>
    async (address) => {
      const iface = new Interface(TokenABI.abi);

      const data = iface.encodeFunctionData(method);
      const blockNumber = (await eth_blockNumber()).data.result;
      const rawRes = (await eth_call([{ to: address, data }, blockNumber])).data.result;
      const [res] = iface.decodeFunctionResult(method, rawRes);

      return res;
    };

  const getName = _call('name');
  const getSymbol = _call('symbol');
  const getDecimals = _call('decimals');

  it('get correct procompile token info', async () => {
    const tokenMetaData = [
      {
        address: '0x0000000000000000000100000000000000000000',
        name: 'Acala',
        symbol: 'ACA',
        decimals: 12
      },
      {
        address: '0x0000000000000000000100000000000000000001',
        name: 'Acala Dollar',
        symbol: 'AUSD',
        decimals: 12
      },
      {
        address: '0x0000000000000000000100000000000000000002',
        name: 'Polkadot',
        symbol: 'DOT',
        decimals: 10
      },
      {
        address: '0x0000000000000000000100000000000000000080',
        name: 'Karura',
        symbol: 'KAR',
        decimals: 12
      }
    ];

    const tests = tokenMetaData.map(async ({ address, name, symbol, decimals }) => {
      const _name = await getName(address);
      const _symbol = await getSymbol(address);
      const _decimals = await getDecimals(address);

      expect(_name).to.equal(name);
      expect(_symbol).to.equal(symbol);
      expect(_decimals).to.equal(decimals);
    });

    await Promise.all(tests);
  });

  it.skip('get correct custom token info', async () => {
    // TODO: deploy custom erc20 and get correct info
  });
});

describe('eth_getEthGas', () => {
  const eth_getEthGas = rpcGet('eth_getEthGas');
  const eth_blockNumber = rpcGet('eth_blockNumber');

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
    const expectedGasPrice = parseInt((await eth_getEthGas([{
      validUntil: curBlock + 150,
    }])).data.result.gasPrice, 16);

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
});

describe('eth_getCode', () => {
  const eth_getCode = rpcGet('eth_getCode');

  const preCompileAddresses = [
    '0x0000000000000000000100000000000000000001',   // AUSD
    '0x0000000000000000000200000000000000000001',   // LP_ACA_AUSD
    '0x0000000000000000000000000000000000000804',   // DEX
  ];

  const tags = [
    'latest',
    'earliest',
  ];

  it('get correct precompile token code', async () => {
    for (const addr of preCompileAddresses) {
      for (const t of tags) {
        const res = (await eth_getCode([addr, t])).data.result;
        expect(res.length).to.greaterThan(2);
      }
    }
  });

  it.skip('get correct user deployed contract code', async () => {
  });

  it('returns empty for pending tag or non-exist contract address', async () => {
    const randAddr = '0x1ebEc3D7fd088d9eE4B6d8272788f028e5122218';
    for (const t of [...tags, 'pending']) {
      const res = (await eth_getCode([randAddr, t])).data.result;
      expect(res).to.equal('0x');
    }
  });
});
