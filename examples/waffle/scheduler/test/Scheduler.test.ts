import { expect, use } from 'chai';
import { ethers, BigNumber, Contract } from 'ethers';
import { deployContract, solidity } from 'ethereum-waffle';
import { AccountSigningKey, Signer, evmChai } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import RecurringPayment from '../build/RecurringPayment.json';
import Subscription from '../build/Subscription.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { getTestProvider } from '../../utils';

use(evmChai);

const provider = getTestProvider();

const testPairs = createTestPairs();
const formatAmount = (amount: String) => {
  return amount.replace(/_/g, '');
};
const dollar = BigNumber.from(formatAmount('1_000_000_000_000'));

const next_block = async (block_number: number) => {
  return new Promise((resolve) => {
    provider.api.tx.system.remark(block_number.toString(16)).signAndSend(testPairs.alice.address, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });
};

const SCHEDULE_CALL_ABI = require('@acala-network/contracts/build/contracts/Schedule.json').abi;
const ERC20_ABI = require('@openzeppelin/contracts/build/contracts/ERC20.json').abi;

describe('Schedule', () => {
  let wallet: Signer;
  let walletTo: Signer;
  let subscriber: Signer;
  let schedule: Contract;

  before(async () => {
    [wallet, walletTo, subscriber] = await provider.getWallets();
    schedule = await new ethers.Contract(ADDRESS.SCHEDULE, SCHEDULE_CALL_ABI, wallet as any);
  });

  after(async () => {
    provider.api.disconnect();
  });

  it('ScheduleCall works', async () => {
    const target_block_number = Number(await provider.api.query.system.number()) + 4;

    const erc20 = new ethers.Contract(ADDRESS.DOT, ERC20_ABI, walletTo as any);
    const tx = await erc20.populateTransaction.transfer(walletTo.getAddress(), 1_000_000);
    // console.log(tx, ethers.utils.hexlify(tx.data as string));

    await schedule.scheduleCall(ADDRESS.DOT, 0, 300000, 10000, 1, ethers.utils.hexlify(tx.data as string));

    let current_block_number = Number(await provider.api.query.system.number());
    let balance = await erc20.balanceOf(await walletTo.getAddress());
    while (current_block_number < target_block_number) {
      await next_block(current_block_number);
      current_block_number = Number(await provider.api.query.system.number());
    }

    let new_balance = await erc20.balanceOf(await walletTo.getAddress());
    expect(new_balance.toString()).to.equal(balance.add(1_000_000).toString());
  });

  it('CancelCall works', async () => {
    const erc20 = new ethers.Contract(ADDRESS.DOT, ERC20_ABI, walletTo as any);
    const tx = await erc20.populateTransaction.transfer(walletTo.getAddress(), 1_000_000);
    // console.log(tx, ethers.utils.hexlify(tx.data as string));

    let iface = new ethers.utils.Interface(SCHEDULE_CALL_ABI);

    let current_block_number = Number(await provider.api.query.system.number());
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
    const erc20 = new ethers.Contract(ADDRESS.DOT, ERC20_ABI, walletTo as any);
    const tx = await erc20.populateTransaction.transfer(walletTo.getAddress(), 1_000_000);
    // console.log(tx, ethers.utils.hexlify(tx.data as string));

    let iface = new ethers.utils.Interface(SCHEDULE_CALL_ABI);

    let current_block_number = Number(await provider.api.query.system.number());
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
    const erc20 = new ethers.Contract(ADDRESS.ACA, ERC20_ABI, walletTo as any);
    const transferTo = await ethers.Wallet.createRandom().getAddress();

    const recurringPayment = await deployContract(
      wallet as any,
      RecurringPayment,
      [3, 4, ethers.utils.parseEther('1000'), transferTo],
      { gasLimit: 2_000_000 }
    );
    // ACA as erc20 decimals is 12
    await erc20.transfer(recurringPayment.address, dollar.mul(5000));
    const inital_block_number = Number(await provider.api.query.system.number());
    await recurringPayment.initialize();

    expect((await provider.getBalance(transferTo)).toString()).to.equal('0');
    expect((await erc20.balanceOf(transferTo)).toString()).to.equal('0');

    let current_block_number = Number(await provider.api.query.system.number());

    while (current_block_number < inital_block_number + 5) {
      await next_block(current_block_number);
      current_block_number = Number(await provider.api.query.system.number());
    }

    expect((await provider.getBalance(transferTo)).toString()).to.equal(dollar.mul(1000000000).toString());
    expect((await erc20.balanceOf(transferTo)).toString()).to.equal(dollar.mul(1000).toString());

    current_block_number = Number(await provider.api.query.system.number());
    while (current_block_number < inital_block_number + 14) {
      await next_block(current_block_number);
      current_block_number = Number(await provider.api.query.system.number());
    }

    expect((await provider.getBalance(transferTo)).toString()).to.equal(dollar.mul(3000000000).toString());
    expect((await erc20.balanceOf(transferTo)).toString()).to.equal(dollar.mul(3000).toString());

    current_block_number = Number(await provider.api.query.system.number());
    // ISchedule task needs one more block
    while (current_block_number < inital_block_number + 17 + 1) {
      await next_block(current_block_number);
      current_block_number = Number(await provider.api.query.system.number());
    }

    expect((await provider.getBalance(recurringPayment.address)).toString()).to.equal('0');
    expect((await erc20.balanceOf(recurringPayment.address)).toNumber()).to.equal(0);
    if (!process.argv.includes('--with-ethereum-compatibility')) {
      expect((await provider.getBalance(transferTo)).toString()).to.equal(
        formatAmount('4_999_959_692_449_420_000_000')
      );
      expect((await erc20.balanceOf(transferTo)).toString()).to.equal(formatAmount('4_999_959_692_449_420'));
    } else {
      expect((await provider.getBalance(transferTo)).toString()).to.equal(dollar.mul(5000000000).toString());
      expect((await erc20.balanceOf(transferTo)).toString()).to.equal(dollar.mul(5000).toString());
    }
  });

  it('works with Subscription', async () => {
    const period = 10;
    const subPrice = ethers.utils.parseEther('1000');

    const subscription = await deployContract(wallet as any, Subscription, [subPrice, period], {
      value: ethers.utils.parseEther('5000'),
      gasLimit: 2_000_000
    });
    if (!process.argv.includes('--with-ethereum-compatibility')) {
      // If it is not called by the maintainer, developer, or contract, it needs to be deployed first
      await provider.api.tx.evm.publishContract(subscription.address).signAndSend(testPairs.alice.address);
    }

    expect((await subscription.balanceOf(subscriber.getAddress())).toString()).to.equal('0');
    expect((await subscription.subTokensOf(subscriber.getAddress())).toString()).to.equal('0');
    expect((await subscription.monthsSubscribed(subscriber.getAddress())).toString()).to.equal('0');

    const subscriberContract = subscription.connect(subscriber as any);
    await subscriberContract.subscribe({
      value: ethers.utils.parseEther(formatAmount('10_000')).toString(),
      gasLimit: 2_000_000
    });

    expect((await subscription.balanceOf(subscriber.getAddress())).toString()).to.equal(
      ethers.utils.parseEther(formatAmount('10_000')).sub(subPrice).toString()
    );
    expect((await subscription.subTokensOf(subscriber.getAddress())).toString()).to.equal('1');
    expect((await subscription.monthsSubscribed(subscriber.getAddress())).toString()).to.equal('1');

    let current_block_number = Number(await provider.api.query.system.number());
    for (let i = 0; i < period + 1; i++) {
      await next_block(current_block_number);
      current_block_number = Number(await provider.api.query.system.number());
    }

    expect((await subscription.balanceOf(subscriber.getAddress())).toString()).to.equal(
      ethers.utils.parseEther(formatAmount('10_000')).sub(subPrice.mul(2)).toString()
    );
    expect((await subscription.subTokensOf(subscriber.getAddress())).toString()).to.equal('3');
    expect((await subscription.monthsSubscribed(subscriber.getAddress())).toString()).to.equal('2');

    current_block_number = Number(await provider.api.query.system.number());
    for (let i = 0; i < period + 1; i++) {
      await next_block(current_block_number);
      current_block_number = Number(await provider.api.query.system.number());
    }

    expect((await subscription.balanceOf(subscriber.getAddress())).toString()).to.equal(
      ethers.utils.parseEther(formatAmount('10_000')).sub(subPrice.mul(3)).toString()
    );
    expect((await subscription.subTokensOf(subscriber.getAddress())).toString()).to.equal('6');
    expect((await subscription.monthsSubscribed(subscriber.getAddress())).toString()).to.equal('3');

    await subscriberContract.unsubscribe({ gasLimit: 2_000_000 });

    current_block_number = Number(await provider.api.query.system.number());
    await next_block(current_block_number);

    expect((await subscription.balanceOf(subscriber.getAddress())).toString()).to.equal('0');
    expect((await subscription.subTokensOf(subscriber.getAddress())).toString()).to.equal('6');
    expect((await subscription.monthsSubscribed(subscriber.getAddress())).toString()).to.equal('0');
  });
});
