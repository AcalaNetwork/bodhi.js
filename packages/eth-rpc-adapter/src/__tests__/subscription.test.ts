import { ACA } from '@acala-network/contracts/utils/AcalaAddress';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { expect } from 'chai';
import { parseUnits } from 'ethers/lib/utils';

import { ETH_RPC_URL, ETH_RPC_URL_WS, SubsManager, evmAccounts, getAddrSelector } from './utils';
import { IERC20, IERC20__factory } from './types';

const oneAcaErc20 = parseUnits('1', 12);
const TRANSFER_SELECTOR = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

describe('eth subscription', () => {
  let deployer: Wallet;
  let user: Wallet;
  let provider: JsonRpcProvider;
  let aca: IERC20;

  let subId0: string;
  let subId1: string;
  let subId2: string;
  let subId3: string;
  let sm: SubsManager;

  beforeAll(async () => {
    console.log('setting up subscription ...');

    provider = new AcalaJsonRpcProvider(ETH_RPC_URL);
    deployer = new Wallet(evmAccounts[0].privateKey, provider);
    user = new Wallet(evmAccounts[1].privateKey, provider);
    aca = IERC20__factory.connect(ACA, deployer);

    sm = new SubsManager(ETH_RPC_URL_WS);
    await sm.isReady;

    const userAddrSelector = getAddrSelector(user.address);

    const sub0 = sm.subscribeNewHeads();
    const sub1 = sm.subscribeLogs({});
    const sub2 = sm.subscribeLogs({
      topics: [
        TRANSFER_SELECTOR,
        null,
        [userAddrSelector],
      ],
    });
    const sub3 = sm.subscribeLogs({
      topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aaaaaaaaaaa', // shouldn't match
      ],
    });

    ([subId0, subId1, subId2, subId3] = await Promise.all([sub0, sub1, sub2, sub3]));

    console.log('subscription finished!');
  });

  beforeEach(() => {
    sm.clear();
  });

  afterAll(() => {
    sm.close();
  });

  it('get correct subscrption notification', async () => {
    const receipt = await (await aca.transfer(user.address, oneAcaErc20.mul(8))).wait();
    const txBlockInfo = await provider.send('eth_getBlockByNumber', [receipt.blockNumber, false]);

    const msg0 = await sm.waitForMsg(subId0, data => data.hash === receipt.blockHash); // new block
    const msg1 = await sm.waitForMsg(subId1); // ACA transfer
    const msg2 = await sm.waitForMsg(subId2); // ACA transfer
    const msg3 = await sm.waitForMsg(subId3); // no match

    expect(msg0).to.not.be.undefined;
    expect(msg1).to.not.be.undefined;
    expect(msg2).to.not.be.undefined;
    expect(msg3).to.be.null;

    expect(msg0).to.deep.contains({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: subId0,
        result: txBlockInfo,
      },
    });

    const expectedLog = await provider.send('eth_getLogs', [{ blockHash: receipt.blockHash }]);

    expect(expectedLog.length).to.equal(1);
    delete (expectedLog[0] as any).removed;

    expect(msg1).to.deep.contains({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: subId1,
        result: expectedLog[0],
      },
    });

    expect(msg2).to.deep.contains({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: subId2,
        result: expectedLog[0],
      },
    });

  });

  it('unsubscribe works', async () => {
    const unsubRes = await Promise.all([
      sm.unSubscribe(subId0),
      sm.unSubscribe(subId1),
      sm.unSubscribe(subId3),
      sm.unSubscribe(Wallet.createRandom().address),
    ]);

    expect(unsubRes).to.deep.equal([
      true,
      true,
      true,
      false,
    ]);

    // only sub2 is left
    const receipt = await (await aca.transfer(user.address, oneAcaErc20.mul(3))).wait();
    const txBlockInfo = await provider.send('eth_getBlockByNumber', [receipt.blockNumber, false]);

    const msg0 = await sm.waitForMsg(subId0, data => data.hash === receipt.blockHash); // new block
    const msg1 = await sm.waitForMsg(subId1); // ACA transfer
    const msg2 = await sm.waitForMsg(subId2); // ACA transfer
    const msg3 = await sm.waitForMsg(subId3); // no match

    // after unsubscribe they should not be notified anymore
    expect(msg0).to.be.null;
    expect(msg1).to.be.null;
    expect(msg3).to.be.null;

    const expectedLog = await provider.send('eth_getLogs', [{ blockHash: txBlockInfo.hash }]);

    expect(expectedLog.length).to.equal(1);
    delete (expectedLog[0] as any).removed;

    expect(msg2).to.deep.contains({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: subId2,
        result: expectedLog[0],
      },
    });
  });
});
