import { expect, use } from 'chai';
import { BigNumber } from 'ethers';
import { deployContract } from 'ethereum-waffle';
import { Signer, evmChai, getTestUtils } from '@acala-network/bodhi';
import { EvmRpcProvider, hexlifyRpcResult, SignerProvider } from '@acala-network/eth-providers';
import TestToken from '../build/TestToken.json';
import { AddressOrPair, SubmittableExtrinsic } from '@polkadot/api/types';

use(evmChai);

const endpoint = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

const evmProvider = EvmRpcProvider.from(endpoint, { localMode: true });

const send = async (extrinsic: SubmittableExtrinsic<'promise'>, sender: AddressOrPair) =>
  new Promise((resolve) => {
    extrinsic.signAndSend(sender, (result) => {
      if (result.status.isFinalized || result.status.isInBlock) {
        resolve(undefined);
      }
    });
  });

describe('dex test', () => {
  let wallet: Signer;
  let provider: SignerProvider;

  before(async () => {
    const testUtils = await getTestUtils(endpoint);
    wallet = testUtils.wallets[0];
    provider = testUtils.provider; // this is the same as wallet.provider
    await evmProvider.isReady();
  });

  after(async () => {
    provider.api.disconnect();
    evmProvider.api.disconnect();
  });

  it('dex e2e test', async () => {
    // deploy TokenA
    let TokenA = await deployContract(wallet, TestToken, [BigNumber.from('1000000000000000000')]);
    // deploy TokenB
    let TokenB = await deployContract(wallet, TestToken, [BigNumber.from('1000000000000000000')]);

    // publish TokenA
    const publishTokenA = provider.api.tx.sudo.sudo(provider.api.tx.evm.publishFree(TokenA.address));
    await send(publishTokenA, wallet.substrateAddress);

    // publish TokenB
    const publishTokenB = provider.api.tx.sudo.sudo(provider.api.tx.evm.publishFree(TokenB.address));
    await send(publishTokenB, wallet.substrateAddress);

    // register TokenA
    const registerTokenA = provider.api.tx.sudo.sudo(
      provider.api.tx.assetRegistry.registerErc20Asset(TokenA.address, 1)
    );
    await send(registerTokenA, wallet.substrateAddress);

    // register TokenB
    const registerTokenB = provider.api.tx.sudo.sudo(
      provider.api.tx.assetRegistry.registerErc20Asset(TokenB.address, 1)
    );
    await send(registerTokenB, wallet.substrateAddress);

    const currencyIdA = { Erc20: TokenA.address };
    const currencyIdB = { Erc20: TokenB.address };

    // dex list_provisioning TokenA/TokenB
    const listProvisioningExtrinsic = provider.api.tx.sudo.sudo(
      provider.api.tx.dex.listProvisioning(currencyIdA, currencyIdB, 10, 10, 100, 100, 0)
    );
    await send(listProvisioningExtrinsic, wallet.substrateAddress);

    // dex add_provision TokenA/TokenB
    const addProvisionExtrinsic = provider.api.tx.dex.addProvision(currencyIdA, currencyIdB, 1000, 10000);
    await send(addProvisionExtrinsic, wallet.substrateAddress);

    // dex end_provisioning TokenA/TokenB
    const endProvisioningExtrinsic = provider.api.tx.dex.endProvisioning(currencyIdA, currencyIdB);
    await send(endProvisioningExtrinsic, wallet.substrateAddress);

    // dex swap_with_exact_supply TokenA/TokenB
    const swapWithExactSupplyExtrinsic = provider.api.tx.dex.swapWithExactSupply([currencyIdA, currencyIdB], 10, 1);
    await send(swapWithExactSupplyExtrinsic, wallet.substrateAddress);

    const txHash = swapWithExactSupplyExtrinsic.hash.toHex();
    const tx = await evmProvider.getTransactionByHash(txHash);

    const receipt = await evmProvider.getTxReceiptByHash(txHash);

    const aliceEvmAddress = (await wallet.getAddress()).toLowerCase();
    expect(hexlifyRpcResult(tx)).to.contain({
      hash: txHash,
      from: aliceEvmAddress,
      to: hexlifyRpcResult(TokenA.address),
      gas: '0x200b20',
      input: '0x',
      value: '0x0'
    });

    expect(hexlifyRpcResult(receipt)).deep.eq({
      to: hexlifyRpcResult(TokenA.address),
      from: aliceEvmAddress,
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
