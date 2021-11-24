import ACAABI from '@acala-network/contracts/build/contracts/Token.json';
import ADDRESS from '@acala-network/contracts/utils/Address';
import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import type { KeyringPair } from '@polkadot/keyring/types';
import { expect } from 'chai';
import { EvmRpcProvider } from '../../rpc-provider';
import { sendTx } from '../../utils';
import { computeDefaultSubstrateAddress } from '../../utils/address';
import evmAccounts from '../evmAccounts';
import {
  serializeTransaction,
  Eip712Transaction,
  parseTransaction,
  createTransactionPayload,
  signTransaction
} from '@acala-network/eth-transactions';

it('a series of tests', async () => {
  console.log('test start');
  const endpoint = 'ws://127.0.0.1:9944';
  const account1 = evmAccounts[0];
  const account2 = evmAccounts[1];

  const provider = EvmRpcProvider.from(endpoint);
  const chainId = await provider.chainId();

  const account1Wallet = new Wallet(account1.privateKey).connect(provider as any);

  const acaContract = new Contract(ADDRESS.ACA, ACAABI.abi, account1Wallet);

  const deployHelloWorldData =
    '0x60806040526040518060400160405280600c81526020017f48656c6c6f20576f726c642100000000000000000000000000000000000000008152506000908051906020019061004f929190610062565b5034801561005c57600080fd5b50610166565b82805461006e90610134565b90600052602060002090601f01602090048101928261009057600085556100d7565b82601f106100a957805160ff19168380011785556100d7565b828001600101855582156100d7579182015b828111156100d65782518255916020019190600101906100bb565b5b5090506100e491906100e8565b5090565b5b808211156101015760008160009055506001016100e9565b5090565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061014c57607f821691505b602082108114156101605761015f610105565b5b50919050565b61022e806101756000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063c605f76c14610030575b600080fd5b61003861004e565b6040516100459190610175565b60405180910390f35b6000805461005b906101c6565b80601f0160208091040260200160405190810160405280929190818152602001828054610087906101c6565b80156100d45780601f106100a9576101008083540402835291602001916100d4565b820191906000526020600020905b8154815290600101906020018083116100b757829003601f168201915b505050505081565b600081519050919050565b600082825260208201905092915050565b60005b838110156101165780820151818401526020810190506100fb565b83811115610125576000848401525b50505050565b6000601f19601f8301169050919050565b6000610147826100dc565b61015181856100e7565b93506101618185602086016100f8565b61016a8161012b565b840191505092915050565b6000602082019050818103600083015261018f818461013c565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806101de57607f821691505b602082108114156101f2576101f1610197565b5b5091905056fea26469706673582212204d363ed34111d1be492d4fd086e9f2df62b3c625e89ade31f30e63201ed1e24f64736f6c63430008090033';

  await provider.isReady();
  const pairs = createTestPairs();
  const oneAca = 10n ** BigInt(provider.api.registry.chainDecimals[0]);
  const Alice = pairs.alice;

  expect(computeDefaultSubstrateAddress(account1.evmAddress)).to.equal(account1.defaultSubstrateAddress);
  expect(computeDefaultSubstrateAddress(account2.evmAddress)).to.equal(account2.defaultSubstrateAddress);

  /** transfer aca */
  console.log('transfer aca');
  const queryBalance = () => acaContract.balanceOf(account1.evmAddress);
  const balance1: BigNumber = await queryBalance();
  const amount = 100n * oneAca;
  const extrinsic = provider.api.tx.balances.transfer(account1.defaultSubstrateAddress, amount);
  await extrinsic.signAsync(Alice);
  await sendTx(provider.api, extrinsic);
  const balance2: BigNumber = await queryBalance();
  expect(balance2.sub(balance1).toBigInt()).equal(amount);

  /** send to account2 */
  // const extrinsic2 = provider.api.tx.balances.transfer(account2.defaultSubstrateAddress, amount);
  // await extrinsic2.signAsync(Alice);
  // await sendTx(provider.api, extrinsic2);

  /** serializeTransaction legacyRawTx */
  // console.log('serializeTransaction legacy');
  // const unsignTx: Eip712Transaction = {
  //   nonce: await provider.getTransactionCount(account1Wallet.address),
  //   chainId,
  //   gasLimit:  BigNumber.from('0x030dcf'),
  //   gasPrice: BigNumber.from('0x0186a000002710'),
  //   data: deployHelloWorldData,
  //   value: BigNumber.from(0)
  // };

  // const rawTx = await account1Wallet.signTransaction(unsignTx);

  // const parsedTx = parseTransaction(rawTx);
  // expect(parsedTx.from).equal(account1Wallet.address);
  // expect(parsedTx.data).equal(deployHelloWorldData);

  // console.log(parsedTx);
  // const errorSignTx = rawTx.replace(/.$/, '1');
  // expect(parseTransaction(errorSignTx).from).not.equal(account1Wallet.address);

  // await provider.sendRawTransaction(rawTx);

  /** serializeTransaction eip712 */
  console.log('serializeTransaction eip712');
  console.log('nonce', await provider.getTransactionCount(account1Wallet.address));
  const unsignEip712Tx: Eip712Transaction = {
    nonce: await provider.getTransactionCount(account1Wallet.address),
    chainId,
    gasLimit: BigNumber.from('0x030dcf'),
    data: deployHelloWorldData,
    value: BigNumber.from(0),
    salt: provider.genesisHash,
    validUntil: 10000,
    storageLimit: 100000,
    type: 0x60
  };

  const eip712sig = signTransaction(account1.privateKey, unsignEip712Tx);
  const raw712Tx = serializeTransaction(unsignEip712Tx, eip712sig);

  const parsed712Tx = parseTransaction(raw712Tx);
  expect(parsed712Tx.from).equal(account1Wallet.address);
  expect(parsed712Tx.data).equal(deployHelloWorldData);

  await provider.sendRawTransaction(raw712Tx);

  await provider.disconnect();
});
