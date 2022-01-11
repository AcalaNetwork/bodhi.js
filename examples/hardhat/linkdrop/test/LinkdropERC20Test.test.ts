/* global describe, before, it */

import chai from 'chai';

import { MockProvider, deployContract, solidity } from 'ethereum-waffle';
import { artifacts, ethers } from 'hardhat';
import { getOverrides } from '../helpers/getOverrides';

import { computeProxyAddress, createLink, signReceiverAddress, computeBytecode } from '../scripts/utils';

chai.use(solidity);
const { expect } = chai;

const LinkdropFactory = artifacts.readArtifactSync('LinkdropFactory');
const LinkdropMastercopy = artifacts.readArtifactSync('LinkdropMastercopy');
const TokenMock = artifacts.readArtifactSync('TokenMock');

let provider = new MockProvider();

let linkdropMaster, receiver, nonsender, linkdropSigner, relayer;

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
let standardFee;

const initcode = '0x6352c7420d6000526103ff60206004601c335afa6040516060f3';
const chainId = 4; // Rinkeby
const overrides = getOverrides();

describe('ETH/ERC20 linkdrop tests', () => {
  before(async () => {
    [linkdropMaster, receiver, nonsender, linkdropSigner, relayer] = await ethers.getSigners();
  });

  it('should deploy factory', async () => {
    tokenInstance = await deployContract(linkdropMaster, TokenMock, [], {
      ...overrides
    });
    masterCopy = await deployContract(linkdropMaster, LinkdropMastercopy, [], {
      ...overrides
    });
    factory = await deployContract(linkdropMaster, LinkdropFactory, [masterCopy.address, chainId], {
      ...overrides
    });
    proxyAddress = computeProxyAddress(factory.address, linkdropMaster.address, campaignId, initcode);

    await factory.deployProxy(campaignId, {
      ...overrides
    });

    proxy = new ethers.Contract(proxyAddress, LinkdropMastercopy.abi, linkdropMaster);

    tokenAmount = 100;
    weiAmount = 0;
    tokenAddress = tokenInstance.address;
    tokenAmount = 100;
    expirationTime = 11234234223;
    version = 1;

    await linkdropMaster.sendTransaction({
      to: proxy.address,
      value: ethers.utils.parseEther('2'),
      ...overrides
    });

    await proxy.addSigner(linkdropSigner.address, { ...overrides });

    await factory.addRelayer(relayer.address, { ...overrides });

    factory = factory.connect(relayer);

    await tokenInstance.approve(proxy.address, tokenAmount, { ...overrides });

    link = await createLink(
      linkdropSigner,
      weiAmount,
      tokenAddress,
      tokenAmount,
      expirationTime,
      version,
      chainId,
      proxyAddress
    );

    receiverAddress = ethers.Wallet.createRandom().address;
    receiverSignature = await signReceiverAddress(link.linkKey, receiverAddress);

    let approverBalanceBefore = await tokenInstance.balanceOf(linkdropMaster.address);

    console.log('approverBalanceBefore:', approverBalanceBefore);

    await factory.claim(
      weiAmount,
      tokenAddress,
      tokenAmount,
      expirationTime,
      link.linkId,
      linkdropMaster.address,
      campaignId,
      link.linkdropSignerSignature,
      receiverAddress,
      receiverSignature,
      { ...overrides }
    );

    let approverBalanceAfter = await tokenInstance.balanceOf(linkdropMaster.address);
    console.log('approverBalanceAfter:', approverBalanceAfter);
  });
});
