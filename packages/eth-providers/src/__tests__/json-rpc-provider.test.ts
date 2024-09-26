import { Contract, ContractFactory } from 'ethers';
import { Wallet } from '@ethersproject/wallet';
import { describe, expect, it } from 'vitest';
import { hexZeroPad, parseEther } from 'ethers/lib/utils';

import { AcalaJsonRpcProvider } from '../json-rpc-provider';
import echoJson from './abis/Echo.json';
import erc20Json from './abis/IERC20.json';
import evmAccounts from './utils/evmAccounts';

const localEthRpc = process.env.ETH_RPC || 'http://localhost:8545';

describe('JsonRpcProvider', async () => {
  /* --------- karura --------- */
  const someOne = '0xf7ABcfa42bF7e7d43d3d53C665deD80fDAfB5244';

  const providerKar = new AcalaJsonRpcProvider('https://eth-rpc-karura.aca-api.network');
  const usdcAddr = '0x1F3a10587A20114EA25Ba1b388EE2dD4A337ce27';
  const usdc = new Contract(usdcAddr, erc20Json.abi, providerKar);

  /* --------- local --------- */
  const testKey = evmAccounts[0].privateKey;   // 0x75E480dB528101a381Ce68544611C169Ad7EB342
  const providerLocal = new AcalaJsonRpcProvider(localEthRpc);
  const wallet = new Wallet(testKey, providerLocal);

  describe.concurrent('get chain data', () => {
    it('get chain id', async () => {
      const network = await providerKar.getNetwork();
      expect(network.chainId).to.eq(686);
    });

    it('get block number', async () => {
      const blockNumber = await providerKar.getBlockNumber();
      expect(blockNumber).to.be.gt(0);
    });

    it('get gas price', async () => {
      const gasPrice = await providerKar.getGasPrice();
      expect(gasPrice.gt(0)).to.be.true;
    });

    it('get balance', async () => {
      const balance = await providerKar.getBalance(someOne);
      expect(balance.gt(0)).to.be.true;
    });

    it('get transaction count', async () => {
      const transactionCount = await providerKar.getTransactionCount(wallet.address);
      expect(transactionCount).to.be.gt(0);
    });

    it('get contract code', async () => {
      const bridgeImplAddress = '0xae9d7fe007b3327AA64A32824Aaac52C42a6E624';
      const code = await providerKar.getCode(bridgeImplAddress);
      expect(code.length).to.gt(100);
    });

    it('get transaction by hash', async () => {
      const txHash = '0xbd273dc63f4e5e1998d0f1e191e7bc5e3a3067a4101771dfd7091a32a8784d95';
      const fetchedTransaction = await providerKar.getTransaction(txHash);
      expect(fetchedTransaction.hash).to.equal(txHash);
    });

    it('get transaction receipt', async () => {
      const txHash = '0xbd273dc63f4e5e1998d0f1e191e7bc5e3a3067a4101771dfd7091a32a8784d95';
      const fetchedTransaction = await providerKar.getTransactionReceipt(txHash);
      expect(fetchedTransaction.transactionHash).to.equal(txHash);
    });

    it('get block with transactions', async () => {
      let data = await providerKar.getBlockWithTransactions(1818518);
      expect(data.transactions.length).to.eq(1);

      data = await providerKar.getBlockWithTransactions(2449983);
      expect(data.transactions.length).to.eq(2);
    });

    it('get logs with filter', async () => {
      const userAddr = '0xf7ABcfa42bF7e7d43d3d53C665deD80fDAfB5244';
      const filter = {
        ...usdc.filters.Transfer(null, userAddr),
        fromBlock: 4123797,
        toBlock: 4128888,
      };

      const logs = await providerKar.getLogs(filter);

      expect(logs.length).to.eq(6);
      for (const log of logs) {
        expect(log.topics[0]).to.eq('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');
        expect(log.topics[2]).to.eq(hexZeroPad(userAddr, 32).toLowerCase());
      }
    });
  });

  describe.concurrent('call', () => {
    it('estimate gas', async () => {
      const to = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const value = parseEther('0.1');
      const gasEstimate = await providerKar.estimateGas({
        from: someOne,
        to,
        value,
      });

      expect(gasEstimate.gt(0)).to.be.true;
    });

    it('call a contract view function', async () => {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        usdc.name(),
        usdc.symbol(),
        usdc.decimals(),
        usdc.totalSupply(),
      ]);

      expect(name).to.eq('USD Coin');
      expect(symbol).to.eq('USDC');
      expect(decimals).to.eq(6);
      expect(totalSupply.gt(0)).toBeTruthy();
    });
  });

  describe('send transaction (should not throw tx hash mismatch error)', () => {
    it('transfer', async () => {
      const tx = await wallet.sendTransaction({
        value: parseEther('1'),
        to: wallet.address,
      });

      const receipt = await tx.wait();
      expect(receipt.status).to.eq(1);
    });

    it('deploy and call contract', async () => {
      const echoFactory = new ContractFactory(echoJson.abi, echoJson.bytecode, wallet);
      const echo = await echoFactory.deploy();
      await echo.deployed();

      expect(await echo.echo()).to.equal('Deployed successfully!');

      await (await echo.scream('hello Gogeta!')).wait();
      expect(await echo.echo()).to.equal('hello Gogeta!');

      await (await echo.scream('hello Vegito!')).wait();
      expect(await echo.echo()).to.equal('hello Vegito!');
    });

    it('call contract with access list', async () => {
      const echoFactory = new ContractFactory(echoJson.abi, echoJson.bytecode, wallet);
      const echo = await echoFactory.deploy();
      await echo.deployed();

      expect(await echo.echo()).to.equal('Deployed successfully!');

      const receipt1 = await (await echo.scream('hello Gogeta!')).wait();
      expect(await echo.echo()).to.equal('hello Gogeta!');

      const accessList = [{
        address: echo.address,
        storageKeys: [
          // ...
        ],
      }];
      const receipt2 = await (await echo.scream('hello Vegito!', { accessList, type: 1 })).wait();
      expect(await echo.echo()).to.equal('hello Vegito!');

      // interestingly passing empty access list can still reduce gas cost
      expect(BigInt(receipt1.gasUsed)).toBeGreaterThan(BigInt(receipt2.gasUsed));
    });
  });

  describe('get logs without subql', () => {
    it('works', async () => {
      const echoFactory = new ContractFactory(echoJson.abi, echoJson.bytecode, wallet);
      const echo = await echoFactory.deploy();

      const { blockNumber: block0 } = await (await echo.scream('hello Gogeta!')).wait();
      let logs = await wallet.provider.getLogs({
        address: echo.address,
      });
      expect(logs.length).to.eq(1);

      const { blockNumber: block1 } = await (await echo.scream('hello Vegito!')).wait();
      logs = await wallet.provider.getLogs({
        address: echo.address,
        fromBlock: block0,
        toBlock: block1,
      });
      expect(logs.length).to.eq(2);
    });
  });

  describe('subscription', () => {
    it('subscribe to new block', async () => {
      const curBlockNumber = await providerKar.getBlockNumber();

      const blockNumber = await new Promise((resolve, reject) => {
        const onBlock = (blockNumber: number) => {
          // TODO: is it normal that cb is triggered immediately for current block
          if (blockNumber > curBlockNumber) {
            providerKar.off('block', onBlock);
            resolve(blockNumber);
          }

          setTimeout(() => reject('<providerKar.onBlock> no new block in 30s!'), 30_000);
        };

        providerKar.on('block', onBlock);
      });

      expect(blockNumber).to.be.eq(curBlockNumber + 1);
    });

    // TODO: need to setup whole stack
    it.skip('subscribe to filter', async () => {
      // const tokenFactory = new ContractFactory(erc20Json.abi, erc20Json.bytecode, wallet);
      // const token = await tokenFactory.deploy();
      // await token.deployed();

      // const _data = new Promise(resolve => {
      //   const filter = {
      //     ...token.filters.Transfer(wallet.address, someOne),
      //     fromBlock: 0,
      //   };

      //   providerLocal.on(filter, resolve);
      // });

      // await token.transfer(someOne, parseEther('0.01'));

      // const data = await _data;

      // console.log(data)
    });
  });

});
