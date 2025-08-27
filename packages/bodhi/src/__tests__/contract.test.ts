import { ContractFactory } from 'ethers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BodhiSigner } from '../BodhiSigner';
import { getTestUtils } from '../utils';
import echoJson from './abis/Echo.json';

describe('BodhiSigner contract interaction', () => {
  let wallet: BodhiSigner;

  beforeAll(async () => {
    const endpoint = process.env.ENDPOINT_URL ?? 'ws://localhost:9944';
    wallet = (await getTestUtils(endpoint)).wallets[0];
  });

  afterAll(async () => {
    await wallet.provider.disconnect();
  });

  it('deploy and call contract', async () => {
    const echoFactory = new ContractFactory(echoJson.abi, echoJson.bytecode, wallet);
    const echo = await echoFactory.deploy();
    await echo.deployed();

    expect(await echo.echo()).to.equal('Deployed successfully!');

    await (await echo.scream('hello Gogeta!')).wait();
    expect(await echo.echo()).to.equal('hello Gogeta!');

    await (await echo.scream('hello Vegito!')).wait();
    expect(await echo.echo()).to.equal('hello Vegito!');
  });
});
