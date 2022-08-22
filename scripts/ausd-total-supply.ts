import { Contract } from 'ethers';
import { writeFile, writeFileSync } from 'fs';
import { rpcPost, runWithRetries, sleep } from './utils';

const AUSD_ADDR_ACALA = '0x0000000000000000000100000000000000000000';
const AUSD_ADDR_MOONBEAM = '0xfFfFFFFF52C56A9257bB97f4B2b6F7B2D624ecda';
const AUSD_ADDR_ASTAR = '0xfFFFFfFF00000000000000010000000000000001';

const ACALA_RPC = 'https://tc7-eth.aca-dev.network';
const MOONBEAM_RPC = 'https://rpc.ankr.com/moonbeam';
const ASTAR_RPC = 'https://astar.blastapi.io/0ff0abe7-3413-4bc7-bc38-24fd3e714420';

const ACALA_START_BLOCK = 1638215;
const ACALA_END_BLOCK = 1639493;
const MOONBEAM_START_BLOCK = ACALA_START_BLOCK + 8500;
const MOONBEAM_END_BLOCK = ACALA_END_BLOCK + 8500;
const ASTAR_START_BLOCK = ACALA_START_BLOCK + 630;
const ASTAR_END_BLOCK = ACALA_END_BLOCK + 630;

let ausdAddr: string;
let rpc: string;
let startBlock: number;
let endBlock: number;

switch (process.env.CHAIN) {
  case 'Acala': {
    ausdAddr = AUSD_ADDR_ACALA;
    rpc = ACALA_RPC;
    startBlock = ACALA_START_BLOCK;
    endBlock = ACALA_END_BLOCK;
    break;
  }

  case 'Astar': {
    ausdAddr = AUSD_ADDR_ASTAR;
    rpc = ASTAR_RPC;
    startBlock = ASTAR_START_BLOCK;
    endBlock = ASTAR_END_BLOCK;
    break;
  }

  case 'Moonbeam': {
    ausdAddr = AUSD_ADDR_MOONBEAM;
    rpc = MOONBEAM_RPC;
    startBlock = MOONBEAM_START_BLOCK;
    endBlock = MOONBEAM_END_BLOCK;
    break;
  }

  default: {
    throw new Error('please pick a chain to use: {Acala, Astar, Moonbeam}');
  }
}

const tolBlocks = endBlock - startBlock;

const abi = [
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const ausd = new Contract(ausdAddr, abi);

const eth_call = rpcPost('eth_call', rpc);

const getTotalSupplyAtBlock = async (block: number): Promise<{ [blockNumber: number]: string }> => {
  const tx = await ausd.populateTransaction.totalSupply();
  const { to, data } = tx;

  const res = (await runWithRetries(async () => eth_call([{ to, data }, block]))).data.result;
  const totalSupply = ausd.interface.decodeFunctionResult('totalSupply', res)[0].toBigInt();

  return { [block]: String(totalSupply) };
};

const main = async (): Promise<void> => {
  console.log(`start fetching data for ${process.env.CHAIN} ...`);

  const BATCH_SIZE = 50;
  let finished = 0;
  let pendings = [] as Array<ReturnType<typeof getTotalSupplyAtBlock>>;
  let allRes = {} as ReturnType<typeof getTotalSupplyAtBlock>;
  for (let b = startBlock; b <= endBlock; b++) {
    pendings.push(getTotalSupplyAtBlock(b));

    const shouldFlush = pendings.length === BATCH_SIZE || b === endBlock;
    if (shouldFlush) {
      const results = await Promise.all(pendings);
      results.forEach((data) => {
        // console.log(data)
        allRes = {
          ...allRes,
          ...data
        };
      });

      finished += pendings.length;
      pendings = [];
      console.log(`progress: ${finished}/${tolBlocks} = ${((finished / tolBlocks) * 100).toFixed(2)}%`);

      await sleep(3000);
    }
  }

  const finalRes = Object.entries(allRes).sort();

  writeFileSync('totalSupply.json', JSON.stringify(finalRes, null, 2));
};

main().then(
  () => process.exit(0),
  (e) => {
    console.log(e);
    process.exit(1);
  }
);
