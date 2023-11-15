import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { before, after } from 'mocha';
import { parseUnits } from 'ethers/lib/utils';
import { AcalaJsonRpcProvider, sleep } from '@acala-network/eth-providers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';

import { ERC20, ERC20__factory } from '../typechain-types';
import { SubsManager, getAddrSelector } from './utils';

const oneAcaErc20 = parseUnits('1', 12);
const ACA_ADDR = '0x0000000000000000000100000000000000000000';
const TRANSFER_SELECTOR = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const ETH_RPC_URL = network.config.url;
const ETH_RPC_URL_WS = ETH_RPC_URL.replace('http', 'ws');

describe('eth subscription', () => {
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;
  let provider: JsonRpcProvider;
  let aca: ERC20;

  let subId0: string;
  let subId1: string;
  let subId2: string;
  let subId3: string;
  let sm: SubsManager;

  before('setup subscription', async () => {
    console.log('setting up subscription ...');

    [deployer, user] = await ethers.getSigners();
    aca = ERC20__factory.connect(ACA_ADDR, deployer);

    provider = new AcalaJsonRpcProvider(ETH_RPC_URL);
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

    ([subId0, subId1, subId2, subId3] = await Promise.all([sub0, sub1, sub2, sub3]))

    console.log('subscription finished!')
  });

  beforeEach(() => {
    sm.clear();
  })

  after(() => {
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

    await sleep(10000); // give subql some time to index
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
    ])

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

    await sleep(10000); // give subql some time to index
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
