import { expect, use } from 'chai';
import { BigNumber } from 'ethers';
import { deployContract, solidity } from 'ethereum-waffle';
import { AccountSigningKey, Signer, evmChai } from '@acala-network/bodhi';
import { EvmRpcProvider, hexlifyRpcResult } from '@acala-network/eth-providers';
import TestToken from '../build/TestToken.json';
import { getTestProvider } from '../../utils';

use(evmChai);

const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

const evmProvider = EvmRpcProvider.from(endpoint);
const provider = getTestProvider();

const send = async (extrinsic: any, sender: any) => {
  return new Promise(async (resolve) => {
    extrinsic.signAndSend(sender, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });
};

describe('dex test', () => {
  let alice: Signer;

  before(async () => {
    [alice] = await provider.getWallets();
  });

  after(async () => {
    provider.api.disconnect();
    evmProvider.api.disconnect();
  });

  it('dex e2e test', async () => {
    // deploy TokenA
    let TokenA = await deployContract(alice as any, TestToken, [BigNumber.from('1000000000000000000')]);
    // deploy TokenB
    let TokenB = await deployContract(alice as any, TestToken, [BigNumber.from('1000000000000000000')]);

    // publish TokenA
    const publishTokenA = provider.api.tx.sudo.sudo(provider.api.tx.evm.publishFree(TokenA.address));
    await send(publishTokenA, await alice.getSubstrateAddress());

    // publish TokenB
    const publishTokenB = provider.api.tx.sudo.sudo(provider.api.tx.evm.publishFree(TokenB.address));
    await send(publishTokenB, await alice.getSubstrateAddress());

    // register TokenA
    const registerTokenA = provider.api.tx.sudo.sudo(
      provider.api.tx.assetRegistry.registerErc20Asset(TokenA.address, 1)
    );
    await send(registerTokenA, await alice.getSubstrateAddress());

    // register TokenB
    const registerTokenB = provider.api.tx.sudo.sudo(
      provider.api.tx.assetRegistry.registerErc20Asset(TokenB.address, 1)
    );
    await send(registerTokenB, await alice.getSubstrateAddress());

    const currencyIdA = { Erc20: TokenA.address };
    const currencyIdB = { Erc20: TokenB.address };

    // dex list_provisioning TokenA/TokenB
    const listProvisioningExtrinsic = provider.api.tx.sudo.sudo(
      provider.api.tx.dex.listProvisioning(currencyIdA, currencyIdB, 10, 10, 100, 100, 0)
    );
    await send(listProvisioningExtrinsic, await alice.getSubstrateAddress());

    // dex add_provision TokenA/TokenB
    const addProvisionExtrinsic = provider.api.tx.dex.addProvision(currencyIdA, currencyIdB, 1000, 10000);
    await send(addProvisionExtrinsic, await alice.getSubstrateAddress());

    // dex end_provisioning TokenA/TokenB
    const endProvisioningExtrinsic = provider.api.tx.dex.endProvisioning(currencyIdA, currencyIdB);
    await send(endProvisioningExtrinsic, await alice.getSubstrateAddress());

    // dex swap_with_exact_supply TokenA/TokenB
    const swapWithExactSupplyExtrinsic = provider.api.tx.dex.swapWithExactSupply([currencyIdA, currencyIdB], 10, 1);
    await send(swapWithExactSupplyExtrinsic, await alice.getSubstrateAddress());

    const txHash = swapWithExactSupplyExtrinsic.hash.toHex();
    const tx = await evmProvider.getTransactionByHash(swapWithExactSupplyExtrinsic.hash.toHex());
    console.log(tx);

    const receipt = await evmProvider.getTXReceiptByHash(swapWithExactSupplyExtrinsic.hash.toHex());
    console.log(receipt);

    expect(hexlifyRpcResult(receipt)).deep.eq({
      to: hexlifyRpcResult(TokenA.address),
      from: hexlifyRpcResult(tx.from),
      contractAddress: null,
      transactionIndex: hexlifyRpcResult(tx.transactionIndex),
      gasUsed: hexlifyRpcResult(receipt.gasUsed),
      logsBloom: hexlifyRpcResult(receipt.logsBloom),
      blockHash: tx.blockHash,
      transactionHash: txHash,
      logs: [
        {
          transactionIndex: hexlifyRpcResult(tx.transactionIndex),
          blockNumber: hexlifyRpcResult(tx.blockNumber),
          transactionHash: txHash,
          address: hexlifyRpcResult(TokenA.address),
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0',
            '0x000000000000000000000000905c015e38c24ed973fd6075541a124c621fa743'
          ],
          data: '0x000000000000000000000000000000000000000000000000000000000000000a',
          logIndex: hexlifyRpcResult(0),
          blockHash: tx.blockHash
        },
        {
          transactionIndex: hexlifyRpcResult(tx.transactionIndex),
          blockNumber: hexlifyRpcResult(tx.blockNumber),
          transactionHash: txHash,
          address: hexlifyRpcResult(TokenB.address),
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x000000000000000000000000905c015e38c24ed973fd6075541a124c621fa743',
            '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0'
          ],
          data: '0x0000000000000000000000000000000000000000000000000000000000000062',
          logIndex: hexlifyRpcResult(1),
          blockHash: tx.blockHash
        }
      ],
      blockNumber: hexlifyRpcResult(tx.blockNumber),
      cumulativeGasUsed: hexlifyRpcResult(receipt.cumulativeGasUsed),
      effectiveGasPrice: hexlifyRpcResult(receipt.effectiveGasPrice),
      status: '0x1',
      type: '0x0',
      byzantium: true,
      confirmations: hexlifyRpcResult(0)
    });
  });
});
