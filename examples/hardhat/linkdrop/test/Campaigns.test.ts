/* global describe, before, it */

import chai from 'chai';
import ADDRESS from '@acala-network/contracts/utils/Address';
import { deployContract, MockProvider, solidity } from 'ethereum-waffle';
import { artifacts, ethers } from 'hardhat';
import ACAABI from '@acala-network/contracts/build/contracts/Token.json';
import { computeProxyAddress, computeBytecode } from '../scripts/utils';
import { getOverrides } from '../helpers/getOverrides';

chai.use(solidity);

const { expect } = chai;

const LinkdropFactory = artifacts.readArtifactSync('LinkdropFactory');
const LinkdropMastercopy = artifacts.readArtifactSync('LinkdropMastercopy');
const TokenMock = artifacts.readArtifactSync('TokenMock');

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

let campaignId;
let standardFee;

const initcode = '0x6352c7420d6000526103ff60206004601c335afa6040516060f3';
const chainId = 4; // Rinkeby

const overrides = getOverrides();

describe('Campaigns tests', () => {
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

    factory = await deployContract(deployer, LinkdropFactory, [masterCopy.address, chainId], {
      ...overrides
    });

    expect(factory.address).to.not.eq(ethers.constants.AddressZero);
    let version = await factory.masterCopyVersion();
    expect(version).to.eq(1);
    factory = factory.connect(relayer);
  });

  it('should deploy proxy for the first campaign with signing key', async () => {
    factory = factory.connect(linkdropMaster);
    campaignId = 0;

    // Compute next address with js function
    let expectedAddress = computeProxyAddress(factory.address, linkdropMaster.address, campaignId, initcode);

    await expect(
      factory.deployProxyWithSigner(campaignId, linkdropSigner.address, {
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
  });

  it('should deploy proxy for the second campaign', async () => {
    factory = factory.connect(linkdropMaster);
    campaignId = 1;

    // Compute next address with js function
    let expectedAddress = computeProxyAddress(factory.address, linkdropMaster.address, campaignId, initcode);

    await expect(
      factory.deployProxy(campaignId, {
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
  });

  it('should deploy proxy for the third campaign', async () => {
    factory = factory.connect(linkdropMaster);
    campaignId = 2;

    // Compute next address with js function
    let expectedAddress = computeProxyAddress(factory.address, linkdropMaster.address, campaignId, initcode);
    await expect(
      factory.deployProxy(campaignId, {
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
  });
});
