import {
  eth_call,
  eth_blockNumber,
  eth_getCode,
  runWithRetries,
} from './utils';

const isContractExist = async (addr: string, block: number): Promise<boolean> => {
  const code = await runWithRetries(async () => (await eth_getCode([addr, block])).data.result);
  const exist = code.length > 2;

  // console.log(`checking: ${block} ${exist ? '✅': '❌'}`);

  return exist;
}

const isContractExistBatch = async (addr: string, start?: number, end?: number, chunkSize = 200): Promise<[number, boolean][]> => {
  const startBlock = start ?? 0;
  const endBlock = end ?? parseInt((await eth_blockNumber()).data.result);
  const totalBlocks = endBlock - startBlock + 1;

  const allRes: Array<[number, boolean]> = [];
  let pendings: boolean[] = [];
  let curBatch = 1;
  let existCount = 0;
  let startTime = performance.now();
  for (let i = startBlock; i <= endBlock; i++) {
    pendings.push(isContractExist(addr, i));

    const shouldFlushChunk = pendings.length === chunkSize || i === endBlock;
    if (shouldFlushChunk) {
      const res = await Promise.all(pendings);
      allRes.push(
        ...res.map((x, offset) => {
          x && existCount++;
          return [offset + startBlock, x ? '✅' : '❌']
        })
      );
      pendings = [];

      const endTime = performance.now();
      const time = ((endTime - startTime) / 1000).toFixed(2);
      startTime = endTime;
      console.log(`processed batch ${curBatch++}/${Math.ceil(totalBlocks / chunkSize)}, curblock: ${i}, existCount: ${existCount}/${i - startBlock + 1}, time: ${time}`);
    }
  }

  console.log(`contract exists in blocks ${existCount}/${totalBlocks}`)
  return allRes;
};

const searchContractCreationBlock = async (addr: string): number => {
  const curBlockNumber = parseInt((await eth_blockNumber()).data.result);
  let earliestExistBlock = -1;

  let l = 0;
  let r = curBlockNumber;
  let m: number;
  
  while (l <= r) {
    m = parseInt((l + r) / 2);
    console.log(l, m, r)
    if (await isContractExist(addr, m)) {
      earliestExistBlock = m;
      r = m - 1;
    } else {
      l = m + 1;
    }
  }

  return earliestExistBlock;
}

const main = async () => {
  const addr = '0x02887684a79593677D7F076c84043B94CbE01fEA';      
  // const res = await searchContractCreationBlock(addr);
  const res = await isContractExistBatch(addr, 752013);
  // for (const [number, data] of res) {
  //   console.log(number, data)
  // }
}

main().then(
  () => process.exit(0),
  err => console.log(err)
);
