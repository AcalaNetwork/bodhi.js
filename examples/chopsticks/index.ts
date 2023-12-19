import { Contract, Wallet } from 'ethers';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';

import echoJson from './Echo.json';

const ECHO_ADDRESS = '0xCDD9460d5d59f059aE17b27ab7C3B45a2C2F1B4d';
const PRIVATE_KEY = 'a872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f';
const ETH_ADDRESS = '0x75E480dB528101a381Ce68544611C169Ad7EB342';   // bound to Alice by chopsticks storage override

const LOCAL_ETH_RPC = 'http://localhost:8545';
const ACALA_ETH_RPC = 'https://eth-rpc-acala.aca-api.network';

const main = async () => {
  const providerAcala = new AcalaJsonRpcProvider(ACALA_ETH_RPC);
  const providerLocal = new AcalaJsonRpcProvider(LOCAL_ETH_RPC);
  const signerLocal = new Wallet(PRIVATE_KEY, providerLocal);

  const echoAcala = new Contract(ECHO_ADDRESS, echoJson.abi, providerAcala);
  const echoLocal = new Contract(ECHO_ADDRESS, echoJson.abi, signerLocal);

  const _printState = async (stateName: string) => {
    const msgAcala = await echoAcala.echo();
    const msgLcoal = await echoLocal.echo();
    const balanceAcala = await providerAcala.getBalance(ETH_ADDRESS);
    const balanceLocal = await providerLocal.getBalance(ETH_ADDRESS);

    console.log(`------------------------ ${stateName} ------------------------`);
    console.log(`msg from acala:              [${msgAcala}]`);
    console.log(`msg from local acala fork:   [${msgLcoal}]`);
    console.log(`balance on acala:            [${balanceAcala.toBigInt()}]`);
    console.log(`balance on local acala fork: [${balanceLocal.toBigInt()}]`);
    console.log(`---------------------------------------------------------------`);
    console.log('');
  };

  await _printState('initial state');

  console.log('calling scream() on local acala fork ...');
  console.log('');
  await (await echoLocal.scream('new msg from local acala')).wait();

  await _printState('after calling scream()');
};

main();
