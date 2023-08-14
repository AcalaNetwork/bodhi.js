import { Contract, ContractFactory } from 'ethers';
import { Wallet } from '@ethersproject/wallet';
import { afterAll, describe, expect, it } from 'vitest';
import { hexZeroPad, parseEther } from 'ethers/lib/utils';

import { AcalaJsonRpcProvider } from '../../json-rpc-provider';
import { sleep } from '../../utils';
import echoJson from '../abis/Echo.json';
import erc20Json from '../abis/IERC20.json';

const gasOverride = {
  gasPrice: '0x616dc303ea',
  gasLimit: '0x329b140',
};

const localEthRpc = process.env.ETH_RPC || 'http://localhost:8545';

describe('JsonRpcProvider', async () => {
  /* --------- karura --------- */
  const someOne = '0xf7ABcfa42bF7e7d43d3d53C665deD80fDAfB5244';

  const provider = new AcalaJsonRpcProvider('https://eth-rpc-karura.aca-api.network');
  const usdcAddr = '0x1F3a10587A20114EA25Ba1b388EE2dD4A337ce27';
  const usdc = new Contract(usdcAddr, erc20Json.abi, provider);

  /* --------- local --------- */
  const testKey = 'a872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f';   // 0x75E480dB528101a381Ce68544611C169Ad7EB342
  const providerLocal = new AcalaJsonRpcProvider(localEthRpc);
  const wallet = new Wallet(testKey, providerLocal);

  afterAll(async () => {
    await sleep(5000);
  });

  describe.concurrent('get chain data', () => {
    it('get chain id', async () => {
      const network = await provider.getNetwork();
      expect(network.chainId).to.eq(686);
    });

    it('get block number', async () => {
      const blockNumber = await provider.getBlockNumber();
      expect(blockNumber).to.be.gt(0);
    });

    it('get gas price', async () => {
      const gasPrice = await provider.getGasPrice();
      expect(gasPrice.gt(0)).to.be.true;
    });

    it('get balance', async () => {
      const balance = await provider.getBalance(someOne);
      expect(balance.gt(0)).to.be.true;
    });

    it('get transaction count', async () => {
      const transactionCount = await provider.getTransactionCount(wallet.address);
      expect(transactionCount).to.be.gt(0);
    });

    it('get contract code', async () => {
      const bridgeImplAddress = '0xae9d7fe007b3327AA64A32824Aaac52C42a6E624';
      const code = await provider.getCode(bridgeImplAddress);
      expect(code.length).to.gt(100);
    });

    it('get transaction by hash', async () => {
      const txHash = '0xbd273dc63f4e5e1998d0f1e191e7bc5e3a3067a4101771dfd7091a32a8784d95';
      const fetchedTransaction = await provider.getTransaction(txHash);
      expect(fetchedTransaction.hash).to.equal(txHash);
    });

    it('get transaction receipt', async () => {
      const txHash = '0xbd273dc63f4e5e1998d0f1e191e7bc5e3a3067a4101771dfd7091a32a8784d95';
      const fetchedTransaction = await provider.getTransactionReceipt(txHash);
      expect(fetchedTransaction.transactionHash).to.equal(txHash);
    });

    it('get block with transactions', async () => {
      let data = await provider.getBlockWithTransactions(1818518);
      expect(data.transactions.length).to.eq(1);

      data = await provider.getBlockWithTransactions(2449983);
      expect(data.transactions.length).to.eq(2);
    });

    it('get logs with filter', async () => {
      const userAddr = '0xf7ABcfa42bF7e7d43d3d53C665deD80fDAfB5244';
      const filter = {
        ...usdc.filters.Transfer(null, userAddr),
        fromBlock: 4123797,
        toBlock: 4128888,
      };

      const logs = await provider.getLogs(filter);

      expect(logs.length).to.eq(6);
      for (const log of logs) {
        expect(log.topics[0]).to.eq('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');
        expect(log.topics[2]).to.eq(hexZeroPad(userAddr, 32).toLowerCase());
      }
    });
  });

  describe('call', () => {
    it('estimate gas', async () => {
      const to = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const value = parseEther('0.1');
      const gasEstimate = await provider.estimateGas({
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
      const echo = await echoFactory.deploy(gasOverride);
      await echo.deployed();

      expect(await echo.echo()).to.equal('Deployed successfullyyyyyy!');

      await (await echo.scream('hello Gogeta!')).wait();
      expect(await echo.echo()).to.equal('hello Gogeta!');

      await (await echo.scream('hello Vegito!')).wait();
      expect(await echo.echo()).to.equal('hello Vegito!');
    });
  });

  describe('subscription', () => {
    it('subscribe to new block', async () => {
      const curBlockNumber = await provider.getBlockNumber();

      const blockNumber = await new Promise((resolve, reject) => {
        const onBlock = (blockNumber: number) => {
          // TODO: is it normal that cb is triggered immediately for current block
          if (blockNumber > curBlockNumber) {
            provider.off('block', onBlock);
            resolve(blockNumber);
          }

          setTimeout(() => reject('<provider.onBlock> no new block in 30s!'), 30_000);
        };

        provider.on('block', onBlock);
      });

      expect(blockNumber).to.be.eq(curBlockNumber + 1);
    });

    // TODO: need to setup whole stack
    it.skip('subscribe to filter', async () => {
      // const tokenFactory = new ContractFactory(erc20Json.abi, erc20Json.bytecode, wallet);
      // const token = await tokenFactory.deploy(gasOverride);
      // await token.deployed();

      // const _data = new Promise(resolve => {
      //   const filter = {
      //     ...token.filters.Transfer(wallet.address, someOne),
      //     fromBlock: 0,
      //   };

      //   providerLocal.on(filter, resolve);
      // });

      // await token.transfer(someOne, parseEther('0.01'), gasOverride);

      // const data = await _data;

      // console.log(data)
    });
  });

});
