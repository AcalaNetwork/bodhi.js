import { ethers } from 'hardhat';
import { expect } from 'chai';

import { Echo } from '../typechain-types';

describe('Echo contract', function () {
  let instance: Echo;

  beforeEach(async () => {
    instance = await ethers.deployContract('Echo', []);
    await instance.waitForDeployment();
  });

  it('should set the value of the echo when deploying', async () => {
    expect(await instance.echo()).to.equal('Deployed successfully!');
  });

  describe('Operation', function () {
    it('should update the echo variable', async () => {
      await (await instance.scream('Hello World!')).wait();

      expect(await instance.echo()).to.equal('Hello World!');
    });

    it('should emit a NewEcho event', async () => {
      const tx = await instance.scream('Hello World!');
      await tx.wait();

      await expect(tx)
        .to.emit(instance, 'NewEcho')
        .withArgs('Hello World!', 1);
    });

    it('should increment echo counter in the NewEcho event', async () => {
      await (await instance.scream('Hello World!')).wait();

      const tx = await instance.scream('Hello Goku!');
      await tx.wait();

      await expect(tx)
        .to.emit(instance, 'NewEcho')
        .withArgs('Hello Goku!', 2);
    });

    it('should return input value', async () => {
      const response = await instance.scream.staticCall('Hello World!');

      expect(response).to.equal('Hello World!');
    });
  });
});
