import axios from 'axios';
import { JsonRpcProvider } from '@ethersproject/providers';
import { rpcPost } from './utils';
import { Interface } from 'ethers/lib/utils';
import ERC20_ABI from './ERC20_ABI.json';
import DEX_ABI from './DEX_ABI.json';

const MOONBEAM_RPC = 'https://rpc.ankr.com/moonbeam';

const ACALA_START_BLOCK = 1638215;
const ACALA_END_BLOCK = 1639493;
const MOONBEAM_START_BLOCK = ACALA_START_BLOCK + 8500;
const MOONBEAM_END_BLOCK = ACALA_END_BLOCK + 8500;

const provider = new JsonRpcProvider(MOONBEAM_RPC);
const eth_call = rpcPost('eth_call', MOONBEAM_RPC);

const getAllTx = async (address: string, startBlock: number, endBlock: number): any[] => {
  const res = await axios.get(
    `https://api-moonbeam.moonscan.io/api?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=1QS5VH2CHXPYV5AI8EAQHMR8BWW3DPDV73`
  );

  if (res.data.status !== '1') throw new Error('getAllTx failed ...');

  return res.data.result;
};

const erc20Cache = {};
const getErc20Info = async (address: string): Promise<{ tokenName: string; decimals: string }> => {
  if (erc20Cache[address]) return erc20Cache[address];

  const iface = new Interface(ERC20_ABI);

  const nameData = iface.encodeFunctionData('name', []);
  const decimalsData = iface.encodeFunctionData('decimals', []);

  let tokenName = '';
  let decimals = 0;
  try {
    let rawRes = (await eth_call([{ to: address, data: nameData }, 'latest'])).data.result;
    tokenName = iface.decodeFunctionResult('name', rawRes).toString();

    rawRes = (await eth_call([{ to: address, data: decimalsData }, 'latest'])).data.result;
    decimals = iface.decodeFunctionResult('decimals', rawRes).toString();
  } catch (error) {
    // ignore non-erc20 address
  }

  const res = {
    tokenName,
    decimals
  };
  erc20Cache[address] = res;

  return res;
};

const decodeFunctionInput = (data: string, functionName: string): any => {
  let iFace;
  let res = '';
  try {
    iFace = new Interface(ERC20_ABI);
    res = iFace.decodeFunctionData(functionName, data);
  } catch (error) {
    // not an erc20 tx
  }

  // try {
  //   iFace = new Interface(DEX_ABI);
  //   res = iFace.decodeFunctionData(functionName, data);
  // } catch (error) {
  //   // not an dex tx
  // }

  if (functionName === 'transfer(address dst, uint256 wad)') {
    res = {
      to: res[0],
      value: res[1].toBigInt().toString()
    };
  }

  return res;
};

const getTransferInfoFromLog = async (log) => {
  const { address, topics, data } = log;
  const [, from, to] = topics;
  const { tokenName, decimals } = await getErc20Info(address);

  return {
    from,
    to,
    tokenName,
    value: BigInt(data).toString(),
    decimals
  };
};

const main = async () => {
  const curBlock = await provider.getBlockNumber();
  const allTx = await getAllTx('0x2b8221f97766b0498f4ac578871d088100176749', MOONBEAM_START_BLOCK, curBlock);

  const allInfo = await Promise.all(
    allTx
      .filter((tx) => tx.txreceipt_status === '1')
      .filter((tx) => !tx.functionName.includes('approve'))
      // .filter(tx => tx.hash === '0xc3227369c88ea9d61376c90059747b3de1c37ee748722f2d474423a2ce194f8a')
      .map(async (tx) => {
        let res = {
          blockNumber: tx.blockNumber,
          hash: tx.hash,
          nonce: tx.nonce,
          value: tx.value,
          from: tx.from,
          to: tx.to,
          input: tx.input,
          methodId: tx.methodId,
          functionName: tx.functionName
        };

        const params = decodeFunctionInput(tx.input, tx.functionName);
        const { tokenName } = await getErc20Info(tx.to);

        if (tx.functionName.includes('swap')) {
          const receipt = await provider.getTransactionReceipt(tx.hash);
          const transferLogs = receipt.logs.filter(
            (log) => log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
          );
          const transfers = await Promise.all(transferLogs.map(async (log) => getTransferInfoFromLog(log)));
          res.erc20Transfers = transfers;
          console.log(transfers);
          // res.logs.forEach(console.log);
        }

        return {
          ...res,
          tokenName,
          params
        };
      })
  );

  // allInfo.forEach(console.log)
  console.log(JSON.stringify(allInfo, null, 2));
};

main().then(
  () => process.exit(0),
  (e) => {
    console.log(e);
    process.exit(1);
  }
);
