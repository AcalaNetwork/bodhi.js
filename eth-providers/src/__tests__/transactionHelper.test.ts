import ACAABI from '@acala-network/contracts/build/contracts/Token.json';
import ADDRESS from '@acala-network/contracts/utils/Address';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import type { KeyringPair } from '@polkadot/keyring/types';
import { expect } from 'chai';
import { EvmRpcProvider } from '../rpc-provider';
import { sendTx, calcEthereumTransactionParams, calcSubstrateTransactionParams } from '../utils';
import { computeDefaultSubstrateAddress } from '../utils/address';
import evmAccounts from './evmAccounts';
import {
  serializeTransaction,
  Eip712Transaction,
  parseTransaction,
  createTransactionPayload,
  signTransaction
} from '@acala-network/eth-transactions';
import type { UInt } from '@polkadot/types';

it('transactionHelper', async () => {
  const txFeePerGas = 199999946752n;
  const storageByteDeposit = 100000000000000n;

  const ethParams = calcEthereumTransactionParams({
    gasLimit: 2100001n,
    validUntil: 3601n,
    storageLimit: 64001n,
    txFeePerGas,
    storageByteDeposit
  });

  expect(ethParams.txGasPrice.toBigInt()).equal(200007812072n);
  expect(ethParams.txGasLimit.toBigInt()).equal(34100001n);

  const subParams = calcSubstrateTransactionParams({
    txGasLimit: ethParams.txGasLimit,
    txGasPrice: ethParams.txGasPrice,
    txFeePerGas,
    storageByteDeposit
  });

  expect(subParams.gasLimit.toBigInt()).equal(2100001n);
  expect(subParams.storageLimit.toBigInt()).equal(64000n);
  expect(subParams.validUntil.toBigInt()).equal(3600n);
});
