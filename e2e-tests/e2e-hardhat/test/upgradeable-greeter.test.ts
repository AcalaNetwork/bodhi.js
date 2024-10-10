import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';
import { getImplementationAddress } from '@openzeppelin/upgrades-core';

import { Greeter, GreeterV2, GreeterV2__factory, Greeter__factory } from '../typechain-types';

describe('UpgradeableGreeter contract', () => {
  let greeterFactory: Greeter__factory;
  let greeterV2Factory: GreeterV2__factory;
  let instance: Greeter;
  let instanceV2: GreeterV2;
  let proxyAddr: string;
  let implAddrV1: string;

  const msg0 = 'Hello, Goku!';
  const msg1 = 'Hello, Kakarot!';
  const msg2 = 'Hello, Vegeta!';

  before(async () => {
    console.log('deploying greater V1 and proxy ..');
    greeterFactory = await ethers.getContractFactory('Greeter');
    instance = await upgrades.deployProxy(greeterFactory, [msg0]) as unknown as Greeter;
    await instance.waitForDeployment();

    proxyAddr = await instance.getAddress();
    implAddrV1 = await getImplementationAddress(ethers.provider, proxyAddr);
    console.log('proxy with greeter v1 deployed at', proxyAddr);
    console.log('implementation address', implAddrV1);
  });

  describe('Deployment', () => {
    it('should return the greeting set at deployment', async () => {
      expect(await instance.greet()).to.equal(msg0);
    });

    it('should return a new greeting when one is set', async () => {
      await (await instance.setGreeting(msg1)).wait();
      expect(await instance.greet()).to.equal(msg1);
    });
  });

  describe('Upgrade', () => {
    before(async () => {
      console.log('upgrading to greeter V2 ...');
      greeterV2Factory = await ethers.getContractFactory('GreeterV2');
      instanceV2 = await upgrades.upgradeProxy(await instance.getAddress(), greeterV2Factory) as unknown as GreeterV2;

      let implAddrV2 = await getImplementationAddress(ethers.provider, proxyAddr);
      while (implAddrV2 === implAddrV1) {
        // there is no better way to check if the upgrade is done?
        console.log('still waiting for upgrade confirmation ...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        implAddrV2 = await getImplementationAddress(ethers.provider, proxyAddr);
      }
      console.log('proxy with greeter V2 upgraded at', await instanceV2.getAddress());
      console.log('implementation address V2: ', implAddrV2);
    });

    it('should maintain the greeting after the upgrade', async () => {
      expect(await instanceV2.greet()).to.equal(msg1);
    });

    it('should maintain the original method', async () => {
      await (await instanceV2.setGreeting(msg2)).wait();
      expect(await instanceV2.greet()).to.equal(msg2);
    });

    it('should add a new method', async () => {
      await (await instanceV2.setGreetingV2(msg2)).wait();
      expect(await instanceV2.greet()).to.equal(`${msg2} - V2`);
    });
  });
});
