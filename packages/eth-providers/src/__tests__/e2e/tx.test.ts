import { AcalaEvmTX, parseTransaction, serializeTransaction, signTransaction } from '@acala-network/eth-transactions';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { EvmRpcProvider } from '../../rpc-provider';
import { Interface, parseUnits } from 'ethers/lib/utils';
import { Wallet } from '@ethersproject/wallet';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { calcEthereumTransactionParams, sendTx, sleep } from '../../utils';
import { computeDefaultSubstrateAddress } from '../../utils/address';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import ACAABI from '@acala-network/contracts/build/contracts/Token.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import dotenv from 'dotenv';
import evmAccounts from '../evmAccounts';
import type { UInt } from '@polkadot/types';

dotenv.config();

describe('transaction tests', () => {
  const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';
  const provider = EvmRpcProvider.from(endpoint);

  const account1 = evmAccounts[0];
  const account2 = evmAccounts[1];
  const account3 = evmAccounts[2];
  const account4 = evmAccounts[3];
  const wallet1 = new Wallet(account1.privateKey).connect(provider as any);
  const wallet2 = new Wallet(account2.privateKey).connect(provider as any);
  const wallet3 = new Wallet(account3.privateKey).connect(provider as any);
  const wallet4 = new Wallet(account4.privateKey).connect(provider as any);

  let chainId: number;
  let storageByteDeposit: bigint;
  let txFeePerGas: bigint;
  let txGasLimit: BigNumber;
  let txGasPrice: BigNumber;

  // prepare common variables
  beforeAll(async () => {
    await provider.isReady();

    chainId = await provider.chainId();
    storageByteDeposit = (provider.api.consts.evm.storageDepositPerByte as UInt).toBigInt();
    txFeePerGas = (provider.api.consts.evm.txFeePerGas as UInt).toBigInt();

    ({ txGasLimit, txGasPrice } = calcEthereumTransactionParams({
      gasLimit: 2100001n,
      validUntil: 360001n,
      storageLimit: 64001n,
      txFeePerGas,
      storageByteDeposit,
    }));

    // make sure wallet 1 has balance
    await wallet3.sendTransaction({
      chainId,
      to: wallet1.address,
      gasLimit: txGasLimit,
      gasPrice: txGasPrice,
      value: 100000000000000000000n,
    });
  });

  // clean up
  afterAll(async () => {
    await sleep(5000);
    await provider.disconnect();
  });

  describe.concurrent('test eth gas', () => {
    it('getEthResources', async () => {
      const randomWallet = Wallet.createRandom().connect(provider);

      const amount = '1000000000000000000';
      const resources = await provider.getEthResources({
        type: 0,
        from: wallet3.address,
        to: randomWallet.address,
        value: BigNumber.from(amount),
      });

      await wallet3.sendTransaction({
        type: 0,
        to: randomWallet.address,
        value: BigNumber.from(amount),
        ...resources,
      });

      expect((await randomWallet.getBalance()).toString()).eq(amount);
    });

    it('getPrice', async () => {
      const randomWallet = Wallet.createRandom().connect(provider);

      const amount = '1000000000000000000';

      const params = await wallet3.populateTransaction({
        type: 0,
        to: randomWallet.address,
        value: BigNumber.from(amount),
      });

      const data = provider.validSubstrateResources({
        gasLimit: params.gasLimit,
        gasPrice: params.gasPrice,
      });

      // console.log({
      //   gasLimit: data.gasLimit.toString(),
      //   storageLimit: data.storageLimit.toString(),
      //   validUntil: data.validUntil.toString()
      // });

      // expect((await randomWallet.getBalance()).toString()).eq(amount);
    });
  });

  describe.concurrent('test the error tx', () => {
    it('InvalidDecimals', async () => {
      await expect(
        wallet1.sendTransaction({
          type: 0,
          to: wallet2.address,
          value: 1000001,
          gasLimit: txGasLimit,
          gasPrice: txGasPrice,
        })
      ).rejects.toThrowError('InvalidDecimals');
    });

    it('OutOfFund', async () => {
      await expect(
        wallet1.sendTransaction({
          type: 0,
          to: wallet2.address,
          value: 1000000000n * 10n ** 18n,
          gasLimit: txGasLimit,
          gasPrice: txGasPrice,
        })
      ).rejects.toThrowError('outOfFund');
    });

    it('ExistentialDeposit', async () => {
      await expect(
        wallet3.sendTransaction({
          type: 0,
          to: Wallet.createRandom().address,
          value: 1000000,
          gasLimit: txGasLimit,
          gasPrice: txGasPrice,
        })
      ).rejects.toThrowError('ExistentialDeposit');
    });
  });

  describe('test deploy contract (hello world)', () => {
    const deployHelloWorldData =
      '0x60806040526040518060400160405280600c81526020017f48656c6c6f20576f726c642100000000000000000000000000000000000000008152506000908051906020019061004f929190610062565b5034801561005c57600080fd5b50610166565b82805461006e90610134565b90600052602060002090601f01602090048101928261009057600085556100d7565b82601f106100a957805160ff19168380011785556100d7565b828001600101855582156100d7579182015b828111156100d65782518255916020019190600101906100bb565b5b5090506100e491906100e8565b5090565b5b808211156101015760008160009055506001016100e9565b5090565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061014c57607f821691505b602082108114156101605761015f610105565b5b50919050565b61022e806101756000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063c605f76c14610030575b600080fd5b61003861004e565b6040516100459190610175565b60405180910390f35b6000805461005b906101c6565b80601f0160208091040260200160405190810160405280929190818152602001828054610087906101c6565b80156100d45780601f106100a9576101008083540402835291602001916100d4565b820191906000526020600020905b8154815290600101906020018083116100b757829003601f168201915b505050505081565b600081519050919050565b600082825260208201905092915050565b60005b838110156101165780820151818401526020810190506100fb565b83811115610125576000848401525b50505050565b6000601f19601f8301169050919050565b6000610147826100dc565b61015181856100e7565b93506101618185602086016100f8565b61016a8161012b565b840191505092915050565b6000602082019050818103600083015261018f818461013c565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806101de57607f821691505b602082108114156101f2576101f1610197565b5b5091905056fea26469706673582212204d363ed34111d1be492d4fd086e9f2df62b3c625e89ade31f30e63201ed1e24f64736f6c63430008090033';

    let partialDeployTx;

    beforeAll(() => {
      partialDeployTx = {
        chainId,
        gasLimit: txGasLimit,
        gasPrice: txGasPrice,
        data: deployHelloWorldData,
        value: BigNumber.from(0),
      };
    });

    describe('with wallet', () => {
      it('succeeds', async () => {
        const response = await wallet1.sendTransaction({
          ...partialDeployTx,
          type: 0,
        });
        const receipt = await response.wait(0);

        expect(receipt.type).equal(0);
        expect(receipt.status).equal(1);
        expect(receipt.from).equal(wallet1.address);
      });
    });

    describe('with legacy EIP-155 signature', () => {
      it('serialize, parse, and send tx correctly', async () => {
        const unsignedTx: AcalaEvmTX = {
          ...partialDeployTx,
          nonce: await wallet1.getTransactionCount(),
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

        const response = await provider.sendTransaction(rawTx);
        const receipt = await response.wait(0);

        expect(receipt.type).equal(0); // TODO: should be null, need to fix getPartialTransactionReceipt
        expect(receipt.status).equal(1);
        expect(receipt.from).equal(wallet1.address);
      });
    });

    describe('with EIP-1559 signature', () => {
      it('serialize, parse, and send tx correctly', async () => {
        const priorityFee = BigNumber.from(2);
        const unsignedTx: AcalaEvmTX = {
          ...partialDeployTx,
          nonce: await wallet1.getTransactionCount(),
          gasPrice: undefined,
          maxPriorityFeePerGas: priorityFee,
          maxFeePerGas: txGasPrice,
          type: 2,
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

        const response = await provider.sendTransaction(rawTx);
        const receipt = await response.wait(0);

        expect(receipt.type).equal(0); // TODO: should be 2, need to fix getPartialTransactionReceipt
        expect(receipt.status).equal(1);
        expect(receipt.from).equal(wallet1.address);
      });
    });

    describe('with EIP-712 signature', () => {
      let rawTx1: string;
      let rawTx2: string;

      it('serialize, parse, and send tx correctly', async () => {
        const gasLimit = BigNumber.from('210000');
        const validUntil = 10000;
        const storageLimit = 100000;

        const unsignEip712Tx: AcalaEvmTX = {
          ...partialDeployTx,
          nonce: await wallet1.getTransactionCount(),
          salt: provider.genesisHash,
          gasLimit,
          validUntil,
          storageLimit,
          type: 0x60,
          accessList: [],
        };

        const sig = signTransaction(account1.privateKey, unsignEip712Tx);
        rawTx1 = serializeTransaction(unsignEip712Tx, sig);
        const parsedTx = parseTransaction(rawTx1);

        expect(parsedTx.gasLimit.eq(gasLimit)).equal(true);
        expect(BigNumber.from(parsedTx.validUntil).eq(validUntil)).equal(true);
        expect(BigNumber.from(parsedTx.storageLimit).eq(storageLimit)).equal(true);

        expect(parsedTx.from).equal(wallet1.address);
        expect(parsedTx.data).equal(deployHelloWorldData);
        expect(parsedTx.type).equal(96);
        expect(parsedTx.maxPriorityFeePerGas).equal(undefined);
        expect(parsedTx.maxFeePerGas).equal(undefined);
      });

      it('eip712 tip', async () => {
        const gasLimit = BigNumber.from('210000');
        const validUntil = 10000;
        const storageLimit = 100000;

        const unsignEip712Tx: AcalaEvmTX = {
          ...partialDeployTx,
          nonce: (await wallet1.getTransactionCount()) + 1,
          salt: provider.genesisHash,
          gasLimit,
          validUntil,
          storageLimit,
          tip: 2,
          type: 0x60,
          accessList: [],
        };

        const sig = signTransaction(account1.privateKey, unsignEip712Tx);
        rawTx2 = serializeTransaction(unsignEip712Tx, sig);
        const parsedTx = parseTransaction(rawTx2);

        expect(parsedTx.gasLimit.eq(gasLimit)).equal(true);
        expect(BigNumber.from(parsedTx.validUntil).eq(validUntil)).equal(true);
        expect(BigNumber.from(parsedTx.storageLimit).eq(storageLimit)).equal(true);

        expect(BigNumber.from(parsedTx.tip).eq(2)).equal(true);
        expect(parsedTx.from).equal(wallet1.address);
        expect(parsedTx.data).equal(deployHelloWorldData);
        expect(parsedTx.type).equal(96);
        expect(parsedTx.maxPriorityFeePerGas).equal(undefined);
        expect(parsedTx.maxFeePerGas).equal(undefined);
      });

      it('send eip712 tx', async () => {
        await provider.sendTransaction(rawTx1);
        await provider.sendTransaction(rawTx2);
      });
    });
  });

  describe('test call contract (transfer ACA)', () => {
    const ACADigits = provider.api.registry.chainDecimals[0];
    const acaContract = new Contract(ADDRESS.ACA, ACAABI.abi, wallet1);
    const iface = new Interface(ACAABI.abi);
    const queryBalance = async (addr: string): Promise<BigNumber> => acaContract.balanceOf(addr);
    const transferAmount = parseUnits('100', ACADigits);
    let partialTransferTX: any;

    beforeAll(() => {
      partialTransferTX = {
        chainId,
        to: ADDRESS.ACA,
        gasLimit: txGasLimit,
        gasPrice: txGasPrice,
        data: iface.encodeFunctionData('transfer', [account2.evmAddress, transferAmount]),
        value: BigNumber.from(0),
      };
    });

    it('evm address match', () => {
      expect(computeDefaultSubstrateAddress(account1.evmAddress)).to.equal(account1.defaultSubstrateAddress);
      expect(computeDefaultSubstrateAddress(account2.evmAddress)).to.equal(account2.defaultSubstrateAddress);
    });

    describe('with provider', () => {
      it('has correct balance after transfer', async () => {
        const pairs = createTestPairs();
        const alice = pairs.alice;

        const oneAca = 10n ** BigInt(ACADigits);
        const amount = 1000n * oneAca;
        const balance = await queryBalance(account1.evmAddress);

        const extrinsic = provider.api.tx.balances.transfer(account1.defaultSubstrateAddress, amount);
        await extrinsic.signAsync(alice);
        await sendTx(provider.api, extrinsic);

        const _balance = await queryBalance(account1.evmAddress);
        expect(_balance.sub(balance).toBigInt()).equal(amount);
      });
    });

    describe('with legacy EIP-155 signature', () => {
      it('has correct balance after transfer', async () => {
        const balance1 = await queryBalance(account1.evmAddress);
        const balance2 = await queryBalance(account2.evmAddress);

        const transferTX: AcalaEvmTX = {
          ...partialTransferTX,
          nonce: await wallet1.getTransactionCount(),
        };

        const rawTx = await wallet1.signTransaction(transferTX);
        const parsedTx = parseTransaction(rawTx);

        const response = await provider.sendTransaction(rawTx);
        const receipt = await response.wait(0);

        const _balance1 = await queryBalance(account1.evmAddress);
        const _balance2 = await queryBalance(account2.evmAddress);

        // TODO: check sender's balance is correct
        // expect(balance1.sub(_balance1).toNumber()).equal(transferAmount.toNumber() + gasUsed);
        expect(_balance2.sub(balance2).toNumber()).equal(transferAmount.toNumber());
      });
    });

    describe('with EIP-1559 signature', () => {
      it('has correct balance after transfer', async () => {
        const balance1 = await queryBalance(account1.evmAddress);
        const balance2 = await queryBalance(account2.evmAddress);

        const priorityFee = BigNumber.from(2);
        const transferTX: AcalaEvmTX = {
          ...partialTransferTX,
          nonce: await wallet1.getTransactionCount(),
          gasPrice: undefined,
          maxPriorityFeePerGas: priorityFee,
          maxFeePerGas: txGasPrice,
          type: 2,
        };

        const rawTx = await wallet1.signTransaction(transferTX);
        const parsedTx = parseTransaction(rawTx);

        const response = await provider.sendTransaction(rawTx);
        const receipt = await response.wait(0);

        const _balance1 = await queryBalance(account1.evmAddress);
        const _balance2 = await queryBalance(account2.evmAddress);

        // TODO: check sender's balance is correct
        // expect(balance1.sub(_balance1).toNumber()).equal(transferAmount.toNumber() + gasUsed);
        expect(_balance2.sub(balance2).toNumber()).equal(transferAmount.toNumber());
      });
    });

    describe('with EIP-712 signature', () => {
      it('has correct balance after transfer', async () => {
        const balance1 = await queryBalance(account1.evmAddress);
        const balance2 = await queryBalance(account2.evmAddress);

        const gasLimit = BigNumber.from('210000');
        const validUntil = 10000;
        const storageLimit = 100000;

        const transferTX: AcalaEvmTX = {
          ...partialTransferTX,
          nonce: await wallet1.getTransactionCount(),
          salt: provider.genesisHash,
          gasLimit,
          validUntil,
          storageLimit,
          type: 0x60,
          accessList: [],
        };

        const sig = signTransaction(account1.privateKey, transferTX);
        const rawTx = serializeTransaction(transferTX, sig);
        const parsedTx = parseTransaction(rawTx);

        await provider.sendTransaction(rawTx);

        const _balance1 = await queryBalance(account1.evmAddress);
        const _balance2 = await queryBalance(account2.evmAddress);

        // TODO: check sender's balance is correct
        // expect(balance1.sub(_balance1).toNumber()).equal(transferAmount.toNumber() + gasUsed);
        expect(_balance2.sub(balance2).toNumber()).equal(transferAmount.toNumber());
      });
    });
  });
});
