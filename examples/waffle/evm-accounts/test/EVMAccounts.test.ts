import { Signer, getTestUtils } from '@acala-network/bodhi';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
import { expect, use } from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { Contract, ethers } from 'ethers';
import EVMAccounts from '../build/EVMAccounts.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { Keyring } from '@polkadot/keyring';
import { randomAsHex, blake2AsU8a } from '@polkadot/util-crypto';
import { u8aConcat, stringToU8a, u8aToHex } from '@polkadot/util';

import { evmChai } from '../../evm-chai';

use(solidity);
use(evmChai);

const testPairs = createTestPairs();
const EVMAccountsABI = require('@acala-network/contracts/build/contracts/EVMAccounts.json').abi;

describe('EVM Accounts', () => {
  let wallet: Signer;
  let evmAccounts: Contract;
  let evmAccountsPredeployed: Contract;

  before(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    wallet = (await getTestUtils(endpoint)).wallets[0];
    evmAccounts = await deployContract(wallet, EVMAccounts);
    evmAccountsPredeployed = new ethers.Contract(ADDRESS.EVM_ACCOUNTS, EVMAccountsABI, wallet);
  });

  after(async () => {
    await wallet.provider.api.disconnect();
  });

  it('evm accounts works', async () => {
    const evmAddress = ethers.Wallet.createRandom().address;
    const evmAccountId = await evmAccountsPredeployed.getAccountId(evmAddress);

    const keyring = new Keyring();
    const randomMini = randomAsHex(32);
    const randPublicKey = u8aToHex(keyring.createFromUri(`${randomMini}//hard`).addressRaw);
    const alicePublicKey = u8aToHex(testPairs.alice.addressRaw);

    expect((await evmAccountsPredeployed.getEvmAddress(evmAccountId)).toString()).to.equal(evmAddress);

    // mapped
    expect((await evmAccountsPredeployed.getEvmAddress(alicePublicKey)).toString()).to.equal(
      '0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0'
    );

    // mapped revert
    await expect(evmAccountsPredeployed.claimDefaultEvmAddress(alicePublicKey)).to.be.revertedWith(
      'AccountIdHasMapped'
    );

    // not mapped return 0x0 address
    expect((await evmAccountsPredeployed.getEvmAddress(randPublicKey)).toString()).to.equal(
      '0x0000000000000000000000000000000000000000'
    );

    await evmAccountsPredeployed.claimDefaultEvmAddress(randPublicKey);

    // let payload = (b"evm:", account_id);
    // EvmAddress::from_slice(&payload.using_encoded(blake2_256)[0..20])
    const address = blake2AsU8a(u8aConcat(stringToU8a('evm:'), randPublicKey), 256);
    expect((await evmAccountsPredeployed.getEvmAddress(randPublicKey)).toString().toLocaleUpperCase()).to.equal(
      u8aToHex(address.subarray(0, 20)).toString().toLocaleUpperCase()
    );
  });

  it('evm accounts in solidity works', async () => {
    const evmAddress = ethers.Wallet.createRandom().address;
    const evmAccountId = await evmAccounts.getAccountId(evmAddress);

    const keyring = new Keyring();
    const randomMini = randomAsHex(32);
    const randPublicKey = u8aToHex(keyring.createFromUri(`${randomMini}//hard`).addressRaw);
    const alicePublicKey = u8aToHex(testPairs.alice.addressRaw);

    expect((await evmAccounts.getEvmAddress(evmAccountId)).toString()).to.equal(evmAddress);

    // mapped
    expect((await evmAccounts.getEvmAddress(alicePublicKey)).toString()).to.equal(
      '0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0'
    );

    // mapped revert
    await expect(evmAccounts.claimDefaultEvmAddress(alicePublicKey)).to.be.revertedWith('AccountIdHasMapped');

    // not mapped return 0x0 address
    expect((await evmAccounts.getEvmAddress(randPublicKey)).toString()).to.equal(
      '0x0000000000000000000000000000000000000000'
    );

    await evmAccounts.claimDefaultEvmAddress(randPublicKey);

    // let payload = (b"evm:", account_id);
    // EvmAddress::from_slice(&payload.using_encoded(blake2_256)[0..20])
    const address = blake2AsU8a(u8aConcat(stringToU8a('evm:'), randPublicKey), 256);
    expect((await evmAccounts.getEvmAddress(randPublicKey)).toString().toLocaleUpperCase()).to.equal(
      u8aToHex(address.subarray(0, 20)).toString().toLocaleUpperCase()
    );
  });
});
