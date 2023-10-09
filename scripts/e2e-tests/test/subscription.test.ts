import { expect } from 'chai';
import { ethers } from 'hardhat';
import { before, after } from 'mocha';
import { hexZeroPad, parseEther } from 'ethers/lib/utils';
import { AcalaJsonRpcProvider, sleep } from '@acala-network/eth-providers';
import WebSocket from 'ws';

import { ERC20, ERC20__factory } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Contract, Wallet } from 'ethers';

const one = parseEther('1');
const ACA_ADDR = '0x0000000000000000000100000000000000000000';

const ETH_RPC_URL = 'http://localhost:8545';
const ETH_RPC_URL_WS = 'ws://localhost:8545';

describe('eth subscription', () => {
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;
  let provider: JsonRpcProvider;
  let aca: ERC20;

  const notifications: any[] = [];
  let subId0: string;
  let subId1: string;
  let subId2: string;
  let subId3: string;
  let ws: WebSocket;

  before('setup subscription', async () => {
    [deployer, user] = await ethers.getSigners();

    provider = new AcalaJsonRpcProvider(ETH_RPC_URL);
    aca = ERC20__factory.connect(ACA_ADDR, deployer);

    ws = new WebSocket(ETH_RPC_URL_WS);
    ws.on('open', () => {
      ws.on('message', (data) => {
        const parsedData = JSON.parse(data.toString());
        notifications.push(parsedData);
      });

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 0,
          method: 'eth_subscribe',
          params: ['newHeads'],
        })
      );

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_subscribe',
          params: ['logs', {}],
        })
      );

      const TRANSFER_SELECTOR = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const USER_ADDR_SELECTOR = hexZeroPad(user.address, 32);

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_subscribe',
          params: [
            'logs',
            {
              topics: [
                TRANSFER_SELECTOR,
                null,
                [USER_ADDR_SELECTOR],
              ],
            },
          ],
        })
      );

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'eth_subscribe',
          params: [
            'logs',
            {
              topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aaaaaaaaaaa', // shouldn't match
              ],
            },
          ],
        })
      );
    });
  });

  after(() => {
    ws.close();
  });

  it('get correct subscrption notification', async () => {
    const receipt = await (await aca.transfer(user.address, 111222333444555)).wait();

    await sleep(3000); // give ws some time to notify

    subId0 = notifications.find((n) => n.id === 0).result;
    subId1 = notifications.find((n) => n.id === 1).result;
    subId2 = notifications.find((n) => n.id === 2).result;
    subId3 = notifications.find((n) => n.id === 3).result;

    const notification0 = notifications.find((n) => n.params?.subscription === subId0); // new block
    const notification1 = notifications.find((n) => n.params?.subscription === subId1); // ACA transfer
    const notification2 = notifications.find((n) => n.params?.subscription === subId2); // ACA transfer
    const notification3 = notifications.find((n) => n.params?.subscription === subId3); // no match

    const curBlockInfo = await provider.send('eth_getBlockByNumber', [receipt.blockNumber, false]);

    expect(notification0).to.deep.contains({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: subId0,
        result: curBlockInfo,
      },
    });

    await sleep(10000); // give subql some time to index
    const expectedLog = await provider.send('eth_getLogs', [{ blockHash: curBlockInfo.hash }]);

    expect(expectedLog.length).to.equal(1);
    delete (expectedLog[0] as any).removed;

    expect(notification0).to.not.be.undefined;
    expect(notification1).to.not.be.undefined;
    expect(notification2).to.not.be.undefined;
    expect(notification3).to.be.undefined;

    expect(notification1).to.deep.contains({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: subId1,
        result: expectedLog[0],
      },
    });
    
    expect(notification2).to.deep.contains({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: subId2,
        result: expectedLog[0],
      },
    });
  });

  it('unsubscribe works', async () => {
    notifications.length = 0;

    let reqId = 10;
    const unsubscribe = async (id: string) => {
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: reqId++,
          method: 'eth_unsubscribe',
          params: [id],
        })
      );

      await sleep(300); // delay each msg to make sure result order is correct
    };

    await unsubscribe(subId0);
    await unsubscribe(subId1);
    await unsubscribe(subId3);
    await unsubscribe(Wallet.createRandom().address);

    await sleep(3000); // give ws some time to notify

    expect(notifications).to.deep.equal([
      { id: 10, jsonrpc: '2.0', result: true },
      { id: 11, jsonrpc: '2.0', result: true },
      { id: 12, jsonrpc: '2.0', result: true },
      { id: 13, jsonrpc: '2.0', result: false },
    ]);

    // only sub2 is left
    notifications.length = 0;
    const receipt = await (await aca.transfer(user.address, 1234567654321)).wait();

    await sleep(10000); // give ws some time to notify

    const notification0 = notifications.find((n) => n.params?.subscription === subId0); // no match
    const notification1 = notifications.find((n) => n.params?.subscription === subId1); // no match
    const notification2 = notifications.find((n) => n.params?.subscription === subId2); // ACA transfer
    const notification3 = notifications.find((n) => n.params?.subscription === subId3); // no match

    // after unsubscribe they should not be notified anymore
    expect(notification0).to.equal(undefined);
    expect(notification1).to.equal(undefined);
    expect(notification3).to.equal(undefined);

    await sleep(10000); // give subql some time to index
    const curBlockInfo = await provider.send('eth_getBlockByNumber', [receipt.blockNumber, false]);
    const expectedLog = await provider.send('eth_getLogs', [{ blockHash: curBlockInfo.hash }]);

    expect(expectedLog.length).to.equal(1);
    delete (expectedLog[0] as any).removed;

    expect(notification2).to.deep.contains({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: subId2,
        result: expectedLog[0],
      },
    });
  });
});
