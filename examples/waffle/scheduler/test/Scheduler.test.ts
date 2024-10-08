import { expect, use } from 'chai';
import { ethers, BigNumber, Contract } from 'ethers';
import { deployContract } from 'ethereum-waffle';
import { getTestUtils, BodhiSigner, BodhiProvider } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import RecurringPayment from '../build/RecurringPayment.json';
import Subscription from '../build/Subscription.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { sleep } from '@acala-network/eth-providers';

import { evmChai } from '../../evm-chai';

use(evmChai);

const testPairs = createTestPairs();
const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};
const dollar = BigNumber.from(formatAmount('1_000_000_000_000'));

const nextBlock = async (provider: BodhiProvider): Promise<void> => {
  const nextBlockNumber = await provider.getBlockNumber() + 1;
  await provider.api.rpc.engine.createBlock(true /* create empty */, true);

  while ((await provider.getBlockNumber()) < nextBlockNumber) {
    // provider internal head is slightly slower than node head
    await sleep(200);
  }
};

const SCHEDULE_CALL_ABI = require('@acala-network/contracts/build/contracts/Schedule.json').abi;
const ERC20_ABI = require('@openzeppelin/contracts/build/contracts/ERC20.json').abi;

describe('Schedule', () => {
  let wallet: BodhiSigner;
  let walletTo: BodhiSigner;
  let subscriber: BodhiSigner;
  let provider: BodhiProvider;
  let schedule: Contract;
  let subscriberAddr: string;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    const testUtils = await getTestUtils(endpoint);
    [wallet, walletTo, subscriber] = testUtils.wallets;
    provider = testUtils.provider; // this is the same as wallet.provider
    subscriberAddr = await subscriber.getAddress();
    schedule = new ethers.Contract(ADDRESS.SCHEDULE, SCHEDULE_CALL_ABI, wallet);
  });

  after(async () => {
    await wallet.provider.api.disconnect();
  });

  it('ScheduleCall works', async () => {
    const target_block_number = await provider.getBlockNumber() + 4;

    const erc20 = new ethers.Contract(ADDRESS.DOT, ERC20_ABI, walletTo);
    const tx = await erc20.populateTransaction.transfer(walletTo.getAddress(), 1_000_000);
    // console.log(tx, ethers.utils.hexlify(tx.data as string));

    await schedule.scheduleCall(ADDRESS.DOT, 0, 300000, 10000, 1, ethers.utils.hexlify(tx.data as string));

    let current_block_number = await provider.getBlockNumber();
    let balance = await erc20.balanceOf(await walletTo.getAddress());
    while (current_block_number < target_block_number) {
      await nextBlock(provider);
      current_block_number = await provider.getBlockNumber();
    }

    let new_balance = await erc20.balanceOf(await walletTo.getAddress());
    expect(new_balance.toString()).to.equal(balance.add(1_000_000).toString());
  });

  it('CancelCall works', async () => {
    const erc20 = new ethers.Contract(ADDRESS.DOT, ERC20_ABI, walletTo);
    const tx = await erc20.populateTransaction.transfer(walletTo.getAddress(), 1_000_000);
    // console.log(tx, ethers.utils.hexlify(tx.data as string));

    let iface = new ethers.utils.Interface(SCHEDULE_CALL_ABI);

    let current_block_number = await provider.getBlockNumber();
    await schedule.scheduleCall(ADDRESS.DOT, 0, 300000, 10000, 2, ethers.utils.hexlify(tx.data as string));

    let block_hash = await provider.api.rpc.chain.getBlockHash(current_block_number + 1);
    const data = await provider.api.derive.tx.events(block_hash);

    let event = data.events.filter((item) => provider.api.events.evm.Executed.is(item.event));
    expect(event.length).above(0);

    let decode_log = iface.parseLog((event[event.length - 1].event.data.toJSON() as any)[2][0]);
    await expect(schedule.cancelCall(ethers.utils.hexlify(decode_log.args.taskId)))
      .to.emit(schedule, 'CanceledCall')
      .withArgs(await wallet.getAddress(), ethers.utils.hexlify(decode_log.args.taskId));
  });

  it('RescheduleCall works', async () => {
    const erc20 = new ethers.Contract(ADDRESS.DOT, ERC20_ABI, walletTo);
    const tx = await erc20.populateTransaction.transfer(walletTo.getAddress(), 1_000_000);
    // console.log(tx, ethers.utils.hexlify(tx.data as string));

    let iface = new ethers.utils.Interface(SCHEDULE_CALL_ABI);

    let current_block_number = await provider.getBlockNumber();
    await schedule.scheduleCall(ADDRESS.DOT, 0, 300000, 10000, 4, ethers.utils.hexlify(tx.data as string));

    let block_hash = await provider.api.rpc.chain.getBlockHash(current_block_number + 1);
    const data = await provider.api.derive.tx.events(block_hash);

    let event = data.events.filter((item) => provider.api.events.evm.Executed.is(item.event));
    expect(event.length).above(0);

    let decode_log = iface.parseLog((event[event.length - 1].event.data.toJSON() as any)[2][0]);
    await expect(schedule.rescheduleCall(5, ethers.utils.hexlify(decode_log.args.taskId)))
      .to.emit(schedule, 'RescheduledCall')
      .withArgs(await wallet.getAddress(), ethers.utils.hexlify(decode_log.args.taskId));
  });

  it('works with RecurringPayment', async () => {
    const erc20 = new ethers.Contract(ADDRESS.ACA, ERC20_ABI, walletTo);
    const transferTo = await ethers.Wallet.createRandom().getAddress();

    const recurringPayment = await deployContract(
      wallet,
      RecurringPayment,
      [3, 4, ethers.utils.parseEther('1000'), transferTo],
    );
    // ACA as erc20 decimals is 12
    await erc20.transfer(recurringPayment.address, dollar.mul(5000));
    const inital_block_number = await provider.getBlockNumber();
    await recurringPayment.initialize();

    expect((await provider.getBalance(transferTo)).toString()).to.equal('0');
    expect((await erc20.balanceOf(transferTo)).toString()).to.equal('0');

    let current_block_number = await provider.getBlockNumber();

    while (current_block_number < inital_block_number + 5) {
      await nextBlock(provider);
      current_block_number = await provider.getBlockNumber();
    }

    expect((await provider.getBalance(transferTo)).toString()).to.equal(dollar.mul(1000000000).toString());
    expect((await erc20.balanceOf(transferTo)).toString()).to.equal(dollar.mul(1000).toString());

    current_block_number = await provider.getBlockNumber();
    while (current_block_number < inital_block_number + 14) {
      await nextBlock(provider);
      current_block_number = await provider.getBlockNumber();
    }

    expect((await provider.getBalance(transferTo)).toString()).to.equal(dollar.mul(3000000000).toString());
    expect((await erc20.balanceOf(transferTo)).toString()).to.equal(dollar.mul(3000).toString());

    current_block_number = await provider.getBlockNumber();
    // ISchedule task needs one more block
    while (current_block_number < inital_block_number + 17 + 1) {
      await nextBlock(provider);
      current_block_number = await provider.getBlockNumber();
    }

    expect((await provider.getBalance(recurringPayment.address)).toString()).to.equal('0');
    expect((await erc20.balanceOf(recurringPayment.address)).toNumber()).to.equal(0);
    if (!process.argv.includes('--with-ethereum-compatibility')) {
      expect((await provider.getBalance(transferTo)).toString()).to.equal(
        formatAmount('4999968960671632000000')
      );

      expect((await erc20.balanceOf(transferTo)).toString()).to.equal(formatAmount('4999968960671632'));
    } else {
      expect((await provider.getBalance(transferTo)).toString()).to.equal(dollar.mul(5000000000).toString());
      expect((await erc20.balanceOf(transferTo)).toString()).to.equal(dollar.mul(5000).toString());
    }
  });

  it('works with Subscription', async () => {
    const period = 10;
    const subPrice = ethers.utils.parseEther('1000');

    const subscription = await deployContract(wallet, Subscription, [subPrice, period], {
      value: ethers.utils.parseEther('5000'),
    });
    if (!process.argv.includes('--with-ethereum-compatibility')) {
      // If it is not called by the maintainer, developer, or contract, it needs to be deployed first
      await provider.api.tx.evm.publishContract(subscription.address).signAndSend(testPairs.alice.address);
    }

    expect((await subscription.balanceOf(subscriberAddr)).toString()).to.equal('0');
    expect((await subscription.subTokensOf(subscriberAddr)).toString()).to.equal('0');
    expect((await subscription.monthsSubscribed(subscriberAddr)).toString()).to.equal('0');

    const subscriberContract = subscription.connect(subscriber as any);
    await subscriberContract.subscribe({
      value: ethers.utils.parseEther(formatAmount('10_000')).toString(),
    });

    expect((await subscription.balanceOf(subscriberAddr)).toString()).to.equal(
      ethers.utils.parseEther(formatAmount('10_000')).sub(subPrice).toString()
    );
    expect((await subscription.subTokensOf(subscriberAddr)).toString()).to.equal('1');
    expect((await subscription.monthsSubscribed(subscriberAddr)).toString()).to.equal('1');

    let current_block_number = await provider.getBlockNumber();
    for (let i = 0; i < period + 1; i++) {
      await nextBlock(provider);
      current_block_number = await provider.getBlockNumber();
    }

    expect((await subscription.balanceOf(subscriberAddr)).toString()).to.equal(
      ethers.utils.parseEther(formatAmount('10_000')).sub(subPrice.mul(2)).toString()
    );
    expect((await subscription.subTokensOf(subscriberAddr)).toString()).to.equal('3');
    expect((await subscription.monthsSubscribed(subscriberAddr)).toString()).to.equal('2');

    current_block_number = await provider.getBlockNumber();
    for (let i = 0; i < period + 1; i++) {
      await nextBlock(provider);
      current_block_number = await provider.getBlockNumber();
    }

    expect((await subscription.balanceOf(subscriberAddr)).toString()).to.equal(
      ethers.utils.parseEther(formatAmount('10_000')).sub(subPrice.mul(3)).toString()
    );
    expect((await subscription.subTokensOf(subscriberAddr)).toString()).to.equal('6');
    expect((await subscription.monthsSubscribed(subscriberAddr)).toString()).to.equal('3');

    await subscriberContract.unsubscribe();

    current_block_number = await provider.getBlockNumber();
    await nextBlock(provider);

    expect((await subscription.balanceOf(subscriberAddr)).toString()).to.equal('0');
    expect((await subscription.subTokensOf(subscriberAddr)).toString()).to.equal('6');
    expect((await subscription.monthsSubscribed(subscriberAddr)).toString()).to.equal('0');
  });
});
