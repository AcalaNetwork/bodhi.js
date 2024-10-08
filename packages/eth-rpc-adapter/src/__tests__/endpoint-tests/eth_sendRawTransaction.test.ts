import { ACA as ACA_ADDR } from '@acala-network/contracts/utils/AcalaAddress';
import { AcalaEvmTXPayload, UnsignedAcalaEvmTX, parseTransaction, serializeTransaction, signTransaction } from '@acala-network/eth-transactions';
import { BigNumber } from 'ethers';
import { Interface, formatEther, parseEther, parseUnits } from 'ethers/lib/utils';
import { ONE_HUNDRED_GWEI, nativeToEthDecimal } from '@acala-network/eth-providers';
import { afterAll, describe, expect, it } from 'vitest';

import {
  bigIntDiff,
  createApi,
  deployHelloWorldData,
  estimateGas,
  eth_chainId,
  eth_getBalance,
  eth_getTransactionReceipt,
  eth_sendRawTransaction,
  getNonce,
  testSetup,
} from '../utils';
import Erc20Abi from '../abis/IERC20.json';

const ETH_Digits = 18;
const ACA_Digits = 12;
const TX_FEE_OFF_TOLERANCE = parseEther('0.02').toBigInt(); // 0.02 ACA

const queryEthBalance = async (addr): Promise<BigNumber> =>
  BigNumber.from((await eth_getBalance([addr, 'latest'])).data.result);

const queryNativeBalance = async (addr: string) =>
  (await queryEthBalance(addr)).div(10 ** (ETH_Digits - ACA_Digits));

const getTxFeeFromReceipt = async (txHash: string, toNative = false): Promise<bigint> => {
  const { gasUsed, effectiveGasPrice } = (await eth_getTransactionReceipt([txHash])).data.result;

  const calculatedTxFee = BigInt(gasUsed) * BigInt(effectiveGasPrice);

  return toNative
    ? calculatedTxFee / BigInt(10 ** (ETH_Digits - ACA_Digits))
    : calculatedTxFee;
};

const {
  provider,
  wallets: [wallet, wallet1],
} = testSetup;

describe('eth_sendRawTransaction', async () => {
  const api = await createApi();
  const genesisHash = api.genesisHash.toHex();
  const chainId = BigNumber.from((await eth_chainId()).data.result).toNumber();

  afterAll(async () => {
    await api.disconnect();
  });

  describe('deploy contract (hello world)', () => {
    const partialDeployTx = {
      chainId,
      data: deployHelloWorldData,
    };

    describe('with legacy EIP-155 signature', () => {
      it('send tx correctly, gas estimation is accurate, receipt\'s gas info is accurate', async () => {
        const prevBalance = await queryEthBalance(wallet.address);

        const unsignedTx = {
          ...partialDeployTx,
          nonce: await getNonce(wallet.address),
          type: 0,
        };

        const { gasPrice, gasLimit } = await estimateGas(unsignedTx);
        const rawTx = await wallet.signTransaction({
          ...unsignedTx,
          gasPrice,
          gasLimit,
        });

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const txHash = res.data.result;
        await provider.waitForTransaction(txHash);

        const receiptTxFee = await getTxFeeFromReceipt(txHash);
        const afterBalance = await queryEthBalance(wallet.address);

        const realTxFee = prevBalance.sub(afterBalance).toBigInt();
        const estimatedTxFee = gasPrice.mul(gasLimit).toBigInt();
        const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);
        const diffEstimateTxFee = bigIntDiff(realTxFee, estimatedTxFee);

        expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;

        // estimated tx fee is slightly overestimated now
        expect(diffEstimateTxFee < TX_FEE_OFF_TOLERANCE).to.be.false;
      });
    });

    describe('with EIP-1559 signature', () => {
      it('throw correct error', async () => {
        const unsignedTx = {
          ...partialDeployTx,
          nonce: await getNonce(wallet.address),
          gasPrice: undefined,
          maxPriorityFeePerGas: BigNumber.from(0),
          maxFeePerGas: ONE_HUNDRED_GWEI,
          type: 2,
        };

        const rawTx = await wallet.signTransaction(unsignedTx);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.data.error?.message).to.contain('unsupported transaction type: 2, please use legacy or EIP-712 instead');
      });
    });

    describe('with EIP-712 signature', () => {
      it('send tx correctly, receipt\'s gas info is accurate', async () => {
        const prevBalance = await queryEthBalance(wallet.address);

        const gasLimit = BigNumber.from('210000');
        const validUntil = 9999999;
        const storageLimit = 100000;

        const unsignEip712Tx = {
          ...partialDeployTx,
          nonce: await getNonce(wallet.address),
          salt: genesisHash,
          gasLimit,
          validUntil,
          storageLimit,
          type: 0x60,
        };

        const sig = signTransaction(wallet.privateKey, unsignEip712Tx as AcalaEvmTXPayload);
        const rawTx = serializeTransaction(unsignEip712Tx as UnsignedAcalaEvmTX, sig);
        const parsedTx = parseTransaction(rawTx);

        expect(parsedTx.gasLimit.eq(gasLimit)).equal(true);
        expect(BigNumber.from(parsedTx.validUntil).eq(validUntil)).equal(true);
        expect(BigNumber.from(parsedTx.storageLimit).eq(storageLimit)).equal(true);

        expect(parsedTx.from).equal(wallet.address);
        expect(parsedTx.data).equal(deployHelloWorldData);
        expect(parsedTx.type).equal(96);
        expect(parsedTx.maxPriorityFeePerGas).equal(undefined);
        expect(parsedTx.maxFeePerGas).equal(undefined);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const txHash = res.data.result;
        await provider.waitForTransaction(txHash);

        const receiptTxFee = await getTxFeeFromReceipt(txHash);
        const afterBalance = await queryEthBalance(wallet.address);

        const realTxFee = prevBalance.sub(afterBalance).toBigInt();
        const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);

        expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
      });
    });
  });

  describe('call contract (transfer ACA)', () => {
    const iface = new Interface(Erc20Abi.abi);
    const transferAmount = parseUnits('12.321', ACA_Digits);
    const partialTransferTX = {
      chainId,
      from: wallet.address,
      to: ACA_ADDR,
      data: iface.encodeFunctionData('transfer', [wallet1.address, transferAmount]),
    };

    describe('with legacy EIP-155 signature', () => {
      it('has correct balance after transfer, and receipt\'s gas info is accurate', async () => {
        const [balance0, balance1] = await Promise.all([
          queryNativeBalance(wallet.address),
          queryNativeBalance(wallet1.address),
        ]);

        const transferTX = {
          ...partialTransferTX,
          nonce: await getNonce(wallet.address),
          type: 0,
        };

        const { gasPrice, gasLimit } = await estimateGas(transferTX);
        const rawTx = await wallet.signTransaction({
          ...transferTX,
          gasPrice,
          gasLimit,
        });

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const txHash = res.data.result;
        await provider.waitForTransaction(txHash);

        const [_balance0, _balance1] = await Promise.all([
          queryNativeBalance(wallet.address),
          queryNativeBalance(wallet1.address),
        ]);

        const receiptTxFee = await getTxFeeFromReceipt(res.data.result);
        const realTxFee = nativeToEthDecimal(balance0.sub(_balance0).sub(transferAmount).toBigInt()).toBigInt();
        const estimatedTxFee = gasPrice.mul(gasLimit).toBigInt();
        const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);
        const diffEstimateTxFee = bigIntDiff(realTxFee, estimatedTxFee);

        expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
        expect(diffEstimateTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
        expect(formatEther(_balance1.sub(balance1))).to.eq(formatEther(transferAmount));
      });
    });

    describe('with EIP-1559 signature', () => {
      it('throw correct error', async () => {
        const priorityFee = BigNumber.from(0);
        const transferTX = {
          ...partialTransferTX,
          nonce: await getNonce(wallet.address),
          gasPrice: undefined,
          maxPriorityFeePerGas: priorityFee,
          maxFeePerGas: 1000000,
          type: 2,
        };

        const rawTx = await wallet.signTransaction(transferTX);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.data.error?.message).to.contain('unsupported transaction type: 2, please use legacy or EIP-712 instead');
      });
    });

    describe('with EIP-712 signature', () => {
      it('has correct balance after transfer, and receipt\'s gas info is accurate', async () => {
        const [balance0, balance1] = await Promise.all([
          queryEthBalance(wallet.address),
          queryEthBalance(wallet1.address),
        ]);

        const gasLimit = BigNumber.from('210000');
        const validUntil = 9999999;
        const storageLimit = 100000;

        const transferTX = {
          ...partialTransferTX,
          nonce: await getNonce(wallet.address),
          salt: genesisHash,
          gasLimit,
          validUntil,
          storageLimit,
          type: 0x60,
        };

        const sig = signTransaction(wallet.privateKey, transferTX as AcalaEvmTXPayload);
        const rawTx = serializeTransaction(transferTX as UnsignedAcalaEvmTX, sig);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const txHash = res.data.result;
        await provider.waitForTransaction(txHash);

        const [_balance0, _balance1] = await Promise.all([
          queryEthBalance(wallet.address),
          queryEthBalance(wallet1.address),
        ]);

        const receiptTxFee = await getTxFeeFromReceipt(txHash);
        const realTxFee = balance0.sub(_balance0).sub(nativeToEthDecimal(transferAmount)).toBigInt();
        const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);

        expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
        expect(formatEther(_balance1.sub(balance1))).to.eq(formatEther(nativeToEthDecimal(transferAmount)));
      });
    });
  });

  describe('send native ACA token', () => {
    const transferAmount = parseEther('16.88');
    const partialNativeTransferTX = {
      chainId,
      from: wallet.address,
      to: wallet1.address,
      value: transferAmount,
    };

    describe('with legacy EIP-155 signature', () => {
      it('has correct balance after transfer, and receipt\'s gas info is accurate', async () => {
        const [balance0, balance1] = await Promise.all([
          queryEthBalance(wallet.address),
          queryEthBalance(wallet1.address),
        ]);

        const unsignedTx = {
          ...partialNativeTransferTX,
          nonce: await getNonce(wallet.address),
          type: 0,
        };

        const { gasPrice, gasLimit } = await estimateGas(unsignedTx);
        const rawTx = await wallet.signTransaction({
          ...unsignedTx,
          gasPrice,
          gasLimit,
        });

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.data.error?.message).to.equal(undefined); // for TX error RPC will still return 200

        const txHash = res.data.result;
        await provider.waitForTransaction(txHash);

        const [_balance0, _balance1] = await Promise.all([
          queryEthBalance(wallet.address),
          queryEthBalance(wallet1.address),
        ]);

        const receiptTxFee = await getTxFeeFromReceipt(res.data.result);
        const realTxFee = balance0.sub(_balance0).sub(transferAmount).toBigInt();
        const estimatedTxFee = gasPrice.mul(gasLimit).toBigInt();
        const diffReceiptTxFee = bigIntDiff(realTxFee, receiptTxFee);
        const diffEstimateTxFee = bigIntDiff(realTxFee, estimatedTxFee);

        expect(diffReceiptTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
        expect(diffEstimateTxFee < TX_FEE_OFF_TOLERANCE).to.be.true;
        expect(formatEther(_balance1.sub(balance1))).to.eq(formatEther(transferAmount));
      });
    });

    describe('with EIP-1559 signature', () => {
      it('throw correct error', async () => {
        const transferTX = {
          ...partialNativeTransferTX,
          nonce: await getNonce(wallet.address),
          gasPrice: undefined,
          maxPriorityFeePerGas: 0,
          maxFeePerGas: 10000000000,
          type: 2,
        };

        const rawTx = await wallet.signTransaction(transferTX);

        const res = await eth_sendRawTransaction([rawTx]);
        expect(res.data.error?.message).to.contain('unsupported transaction type: 2, please use legacy or EIP-712 instead');
      });
    });

    describe('with EIP-712 signature', () => {
      // TODO: EIP-712 doesn't use ETH gasLimit and gasPrice, do we need to support it?
      it.skip('has correct balance after transfer', async () => {
      });
    });
  });
});
