import { expect, use } from 'chai';
import { ethers, Contract } from 'ethers';
import { deployContract, solidity } from 'ethereum-waffle';
import { TestAccountSigningKey, TestProvider, Signer, evmChai } from '@acala-network/bodhi';
import { WsProvider } from '@polkadot/api';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import RecurringPayment from '../build/RecurringPayment.json';
import Subscription from '../build/Subscription.json';
import BlockNumberTest from '../build/BlcokNumberTest.json';
import ADDRESS from '@acala-network/contracts/utils/Address';

use(evmChai);

const provider = new TestProvider({
  provider: new WsProvider('ws://127.0.0.1:9944')
});

const testPairs = createTestPairs();

const next_block = async (block_number: number) => {
  return new Promise((resolve) => {
    provider.api.tx.system.remark(block_number.toString(16)).signAndSend(testPairs.alice.address, (result) => {
      if (result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });
};

describe('e2e test', () => {
  let wallet: Signer;
  let walletTo: Signer;

  before(async () => {
    [wallet, walletTo] = await provider.getWallets();
  });

  after(async () => {
    provider.api.disconnect();
  });

  it('evm block number', async () => {
    let contract = await deployContract(wallet as any, BlockNumberTest);
    let current_block_number = Number(await provider.api.query.system.number());
    let height = await contract.currentBlock();
    expect(await height.toString()).to.eq(current_block_number.toString());
  });
});
