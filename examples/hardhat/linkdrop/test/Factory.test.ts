/* global describe, before, it */

import chai from 'chai';
import { deployContract, solidity } from 'ethereum-waffle';
import { artifacts, ethers } from 'hardhat';
import { computeBytecode, computeProxyAddress } from '../scripts/utils';
import { getOverrides } from '../helpers/getOverrides';

const LinkdropFactory = artifacts.readArtifactSync('LinkdropFactory');
const LinkdropMastercopy = artifacts.readArtifactSync('LinkdropMastercopy');
const TokenMock = artifacts.readArtifactSync('TokenMock');

chai.use(solidity);
const { expect } = chai;

let deployer, linkdropMaster, linkdropSigner, relayer;

let masterCopy;
let factory;
let proxy;
let proxyAddress;
let tokenInstance;

let link;
let receiverAddress;
let receiverSignature;
let weiAmount;
let tokenAddress;
let tokenAmount;
let expirationTime;
let version;
let bytecode;

const campaignId = 0;

const initcode = '0x6352c7420d6000526103ff60206004601c335afa6040516060f3';
const chainId = 4; // Rinkeby

const overrides = getOverrides();

describe('Factory tests', () => {
  before(async () => {
    [deployer, linkdropMaster, linkdropSigner, relayer] = await ethers.getSigners();
    tokenInstance = await deployContract(linkdropMaster, TokenMock, [], overrides);
  });

  it('should deploy master copy of linkdrop implementation', async () => {
    masterCopy = await deployContract(linkdropMaster, LinkdropMastercopy, [], {
      ...overrides
    });
    expect(masterCopy.address).to.not.eq(ethers.constants.AddressZero);
  });

  it('should deploy factory', async () => {
    bytecode = computeBytecode(masterCopy.address);
    factory = await deployContract(linkdropMaster, LinkdropFactory, [masterCopy.address, chainId], {
      ...overrides
    });

    expect(factory.address).to.not.eq(ethers.constants.AddressZero);
    let version = await factory.masterCopyVersion();
    expect(version).to.eq(1);
  });

  it('should deploy proxy with signing key and topup with ethers in single tx', async () => {
    // Compute next address with js function
    let expectedAddress = computeProxyAddress(factory.address, linkdropMaster.address, campaignId, initcode);

    const value = 100000000000000000n; // Existential Deposit 0.1Aca 10^17

    // Lower than Existential Deposit
    await expect(
      factory.deployProxyWithSigner(campaignId, linkdropSigner.address, {
        value: value - 1000000n,
        ...overrides
      })
    ).to.be.reverted;

    await expect(
      factory.deployProxyWithSigner(campaignId, linkdropSigner.address, {
        value,
        ...overrides
      })
    ).to.emit(factory, 'Deployed');

    proxy = new ethers.Contract(expectedAddress, LinkdropMastercopy.abi, linkdropMaster);

    let linkdropMasterAddress = await proxy.linkdropMaster();
    expect(linkdropMasterAddress).to.eq(linkdropMaster.address);

    let version = await proxy.version();
    expect(version).to.eq(1);

    let owner = await proxy.owner();
    expect(owner).to.eq(factory.address);

    let isSigner = await proxy.isLinkdropSigner(linkdropSigner.address);
    expect(isSigner).to.eq(true);

    const balance = await ethers.provider.getBalance(proxy.address);
    expect(balance).to.eq(value);
  });
});
