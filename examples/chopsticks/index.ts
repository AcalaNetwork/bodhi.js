import { Contract, Wallet } from 'ethers';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import echoMeta from './Echo.json';

const ECHO_ADDRESS = '0xe8669bfe6fe29dde37d670fbc1cf96365025c242';
const ECHO_ABI = [
  'function scream(string memory message) public returns(string memory)',
  'function echo() public returns(string)'
];

const PRIVATE_KEY = '0x8d2d614677b99ee1809eec0967d538f43d3f410e20ee5f5b979dd21d5930d3fe';
const ETH_ADDRESS = '0xEE1b6e72FC5bC8738150B6bE7564DA887723cCA1';
const RANDOM_ADDRESS_SUBSTRATE = '5GqBr7hDMWzmd1DS8ruDCweRDUbDDvFT37Bwk8tocTF9RzHF';

const LOCAL_NODE_URL = 'ws://localhost:8000';
const MANDALA_NODE_URL = 'wss://mandala-rpc.aca-staging.network/ws';

const main = async () => {
  const providerMandala = new EvmRpcProvider(MANDALA_NODE_URL);
  const providerLocal = new EvmRpcProvider(LOCAL_NODE_URL);
  const signerLocal = new Wallet(PRIVATE_KEY, providerLocal);

  const echoMandala = new Contract(ECHO_ADDRESS, echoMeta.abi, providerMandala);
  const echoLocal = new Contract(ECHO_ADDRESS, echoMeta.abi, signerLocal);

  const _printState = async (stateName: string) => {
    const msgMandala = await echoMandala.callStatic.echo();
    const msgLcoal = await echoLocal.callStatic.echo();
    const balanceMandala = await providerMandala.getBalance(ETH_ADDRESS);
    const balanceLocal = await providerLocal.getBalance(ETH_ADDRESS);

    console.log(`------------------------ ${stateName} ------------------------`);
    console.log(`msg from public mandala:       [${msgMandala}]`);
    console.log(`msg from local mandala fork:   [${msgLcoal}]`);
    console.log(`balance on public mandala:     [${balanceMandala.toBigInt()}]`);
    console.log(`balance on local mandala fork: [${balanceLocal.toBigInt()}]`);
    console.log(`---------------------------------------------------------------`);
    console.log('');
  };

  await _printState('initial state');

  console.log('calling scream() on local mandala fork ...');
  console.log('');
  await echoLocal.scream('new msg from local mandala');

  await _printState('after calling scream()');

  providerMandala.disconnect();
  providerLocal.disconnect();
};

main();
