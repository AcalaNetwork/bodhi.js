import Factory from '../build/Factory';
import Linkdrop from '../build/Linkdrop';

import chai from 'chai';
import { computeProxyAddress } from './utils';

const { expect } = chai;
const ethers = require('ethers');

let receiver = ethers.Wallet.createRandom().address;
let alice = ethers.Wallet.createRandom().address;

const provider = new ethers.providers.JsonRpcProvider();
let privateKey = '0x9471db4aca21ead4c05fe797dd92975097a61feefb07f39a1423fc7195f73c26';

let wallet = new ethers.Wallet(privateKey, provider);

let linkdrop, linkdropFactory;

const deployLinkdrop = async () => {
  let factory = new ethers.ContractFactory(Linkdrop.abi, Linkdrop.bytecode, wallet);

  linkdrop = await factory.deploy();
  await linkdrop.deployed();
  console.log(`Linkdrop contract deployed at ${linkdrop.address}`);
};

const deployFactory = async () => {
  let factory = new ethers.ContractFactory(Factory.abi, Factory.bytecode, wallet);

  linkdropFactory = await factory.deploy(linkdrop.address, {
    gasLimit: 6000000
  });

  await linkdropFactory.deployed();
  console.log(`Factory contract deployed at ${linkdropFactory.address}`);
};

const deployProxy = async (sender) => {
  let factory = new ethers.Contract(linkdropFactory.address, Factory.abi, wallet);

  // Compute next address with js function
  let expectedAddress = await computeProxyAddress(linkdropFactory.address, sender, linkdrop.address);
  console.log('expectedAddress: ', expectedAddress);

  let tx = await factory.deployProxy(sender);
  await tx.wait();

  console.log(`Proxy contract deployed at ${expectedAddress}`);

  let proxy = new ethers.Contract(expectedAddress, Linkdrop.abi, wallet);

  let senderAddress = await proxy.sender();
  console.log('senderAddress: ', senderAddress);
  expect(sender).to.eq(senderAddress);
};

(async function () {
  await deployLinkdrop();
  await deployFactory();
  await deployProxy(receiver);
  await deployProxy(alice);
})();
