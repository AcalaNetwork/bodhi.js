import { Contract } from 'ethers';
import { writeFile, writeFileSync } from 'fs';
import { rpcPost, runWithRetries, sleep } from './utils';

const AUSD_ADDR = '0xfFfFFFFF52C56A9257bB97f4B2b6F7B2D624ecda';
// const MOONBEAM_RPC = 'https://rpc.api.moonbeam.network';
const MOONBEAM_RPC = 'https://rpc.ankr.com/moonbeam';
const ASTAR_RPC = 'https://astar.blastapi.io/0ff0abe7-3413-4bc7-bc38-24fd3e714420';
const rpc = MOONBEAM_RPC;

const abi = [
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const eth_call = rpcPost('eth_call', rpc);

const getTotalSupplyAtBlock = async (block: number): Promise<{ [blockNumber: number]: string }> => {
  const ausd = new Contract(AUSD_ADDR, abi);

  const tx = await ausd.populateTransaction.totalSupply();
  const { to, data } = tx;

  const res = (await runWithRetries(async () => eth_call([{ to, data }, block]))).data.result;
  const totalSupply = ausd.interface.decodeFunctionResult('totalSupply', res)[0].toBigInt();

  return { [block]: String(totalSupply) };
};

const main = async (): Promise<void> => {
  const acalaStartBlock = 1638215;
  const acalaEndBlock = 1639493;

  // moonbeam block = acala block + 8500
  // astar block = acala block + ??
  const startBlock = acalaStartBlock + 8500;
  const endBlock = acalaEndBlock + 8500;
  const tolBlocks = endBlock - startBlock;

  let tolFinished = 0;
  const BATCH_SIZE = 50;
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

      tolFinished += pendings.length;
      pendings = [];
      console.log(`progress: ${tolFinished}/${tolBlocks} = ${((tolFinished / tolBlocks) * 100).toFixed(2)}%`);

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
