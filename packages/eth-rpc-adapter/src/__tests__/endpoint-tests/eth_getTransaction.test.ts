import { beforeAll, describe, expect, it } from 'vitest';

import { BigNumber, Contract, ContractTransaction } from 'ethers';
import {
  TRANSFER_EVENT_TOPIC,
  deployErc20,
  eth_blockNumber,
  eth_getTransactionByHash,
  eth_getTransactionReceipt,
  testSetup,
} from '../utils';
import { hexZeroPad } from 'ethers/lib/utils';

const { wallets: [wallet, wallet1] } = testSetup;

describe('get tx and receipt', () => {
  let token: Contract;

  beforeAll(async () => {
    token = await deployErc20(wallet);
  });

  it('can get tx and recipt for contract deployment', async () => {
    const tokenDeployedBlock = (await eth_blockNumber()).data.result;
    const txHash = token.deployTransaction.hash;

    const tx = (await eth_getTransactionByHash([txHash])).data.result;
    const receipt = (await eth_getTransactionReceipt([txHash])).data.result;

    console.log(tx);
    console.log(receipt);

    expect(tx).to.contain({
      hash: txHash,
      blockNumber: tokenDeployedBlock,
      from: wallet.address.toLowerCase(),
      to: null,
      value: '0x0',
    });

    expect(receipt).to.deep.contain({
      transactionHash: txHash,
      blockNumber: tokenDeployedBlock,
      from: wallet.address.toLowerCase(),
      to: null,
      logs: [],
      status: '0x1',
      type: '0x0',
    });
  });

  it('can get tx and recipt for token transfer', async () => {
    const transferAmount = 100;
    const pendingTx = await token.transfer(wallet1.address, transferAmount) as ContractTransaction;

    let tx = (await eth_getTransactionByHash([pendingTx.hash])).data.result;
    let receipt = (await eth_getTransactionReceipt([pendingTx.hash])).data.result;

    console.log(tx);
    console.log(receipt);

    expect(tx).to.contain({
      hash: pendingTx.hash,
      blockNumber: null,    // pending tx
      blockHash: null,      // pending tx
      from: wallet.address.toLowerCase(),
      to: token.address.toLowerCase(),
      value: '0x0',
    });

    // not mined yet
    expect(receipt).to.eq(null);

    /* ------------------------- after tx is mined ------------------------- */
    await pendingTx.wait();

    tx = (await eth_getTransactionByHash([pendingTx.hash])).data.result;
    receipt = (await eth_getTransactionReceipt([pendingTx.hash])).data.result;

    console.log(tx);
    console.log(receipt);

    const blockNumber = (await eth_blockNumber()).data.result;
    expect(tx).to.contain({
      hash: pendingTx.hash,
      blockNumber,
      from: wallet.address.toLowerCase(),
      to: token.address.toLowerCase(),
      value: '0x0',
    });

    expect(receipt).toEqual(expect.objectContaining({
      transactionHash: pendingTx.hash,
      blockNumber,
      from: wallet.address.toLowerCase(),
      to: token.address.toLowerCase(),
      logs: [
        expect.objectContaining({
          transactionIndex: '0x0',
          blockNumber: blockNumber,
          transactionHash: pendingTx.hash,
          address: token.address.toLowerCase(),
          topics: [
            TRANSFER_EVENT_TOPIC,
            hexZeroPad(wallet.address.toLowerCase(), 32),
            hexZeroPad(wallet1.address.toLowerCase(), 32),
          ],
          data: hexZeroPad(BigNumber.from(transferAmount).toHexString(), 32),
          logIndex: '0x0',
        }),
      ],
      status: '0x1',
    }));
  });
});
