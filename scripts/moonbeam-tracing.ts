import axios from 'axios';
import { JsonRpcProvider } from '@ethersproject/providers';
import { rpcPost, runWithRetries } from './utils';
import { Interface } from 'ethers/lib/utils';
import ERC20_ABI from './ERC20_ABI.json';
import DEX_ABI from './DEX_ABI.json';
import { BigNumber } from 'ethers';

const maliciousAddresses = [
  '0x2b8221f97766b0498f4ac578871d088100176749',
  '0x57f73c4bff8ebe0fdd91c666fd304804d50fc218',
  '0x1cb3c6b77fde279cf7403a5c0ae2d5fc9d356a55',
  '0x4ac4ff89b9d4b3daf54942e3df63751a4a54c735',
  '0xbd03a214ebc891b3a9e3fe4cba793c5f9f0b38b0',
  '0xebaee4e53e5c286c4b5f0027777eb72bc8b94bf7',
  '0x029dc993d0053b717a69cac26157f4ea466a907a',
  '0xb600e3b53dc0b8a941b92301f4411ac2e31ae4a2',
  '0x30c4abab7ec022c27022aa39f687984e5acba13d',
  '0x80e639e6a2c90b05cdce2701a66ef096852093c8',
  '0xd11b9d446a20b74d9fefb185d847692d84c4b95e',
  '0x07d6e8987a17b95eee44fbd2b7bb65c34442a5c7',
  '0xee7c4aca7d64075550f1b119b4bb4a0aa889c340',
  '0xb82ed2d0dfcd3ad43b3cbfab1f5e9c316f283f9c',
  '0x355b8f6059f5414ab1f69fca34088c4adc554b7f',
  '0x8ff448ed0c027dbe9f5add62e6faee439eac0259',
  '0xf4de3f93ebca01015486be5979d9c01aeeddd367',
  '0x356eb354aea711854e1d69a36643e181a1da8ba5',
  '0x6b99b14cbed12e1f2b8c70681cce0874e24661ee',
  '0x627683779b1fe41a2b350f67a9e8876def078cbb',
  '0x08c3e7b6e273d4434fa466ff23dba7c602a961a7',
  '0x6ab079df6d9f2e6cad08736bba0fb8f35cc0ca40',
  '0xa22868cfd826d0fcf543bdf1814e556e69903f11',
  '0x66721389fd8f9403b1d161fc52b35f906d5421cc',
  '0x5f9febf1f2a99fe11edad119462db23f28a6ddbb',
  '0x08abb2e7b586d80543b61daa91a9d134234d26d5',
  '0xcf43e9a2f9ed4810de89ae08d88445d8ccf63ab1',
  '0x341396d458060aba2ba7ebf1aecf2aab7aea878f',
  '0x3b6a66017b75f04e55c73664dd6a9cf2c8027e0e',
  '0x68be80372bed6078cf58b71a46171697adf678f5'
];

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: 'moonbeam-trace.csv',
  header: [
    { id: 'blockNumber', title: 'blockNumber' },
    { id: 'hash', title: 'hash' },
    { id: 'from', title: 'from' },
    { id: 'to', title: 'to' },
    { id: 'value', title: 'value' },
    { id: 'important', title: 'important' },
    { id: 'action', title: 'action' },
    // transfer
    { id: 'tokenName', title: 'tokenName' },
    { id: 'amount', title: 'amount' },
    { id: 'destination', title: 'destination' },
    // swap
    { id: 'tokenInName', title: 'tokenInName' },
    { id: 'tokenInAmount', title: 'tokenInAmount' },
    { id: 'tokenInDecimals', title: 'tokenInDecimals' },
    { id: 'tokenOutName', title: 'tokenOutName' },
    { id: 'tokenOutAmount', title: 'tokenOutAmount' },
    { id: 'tokenOutDecimals', title: 'tokenOutDecimals' }
  ]
});

const binance1 = '0xF3918988Eb3Ce66527E2a1a4D42C303915cE28CE';

const MOONBEAM_RPC = 'https://rpc.ankr.com/moonbeam';

const ACALA_START_BLOCK = 1638215;
const ACALA_END_BLOCK = 1639493;
const MOONBEAM_START_BLOCK = ACALA_START_BLOCK + 8500;
const MOONBEAM_END_BLOCK = ACALA_END_BLOCK + 8500;

const provider = new JsonRpcProvider(MOONBEAM_RPC);
const eth_call = rpcPost('eth_call', MOONBEAM_RPC);

const ACTIONS = {
  swap: 'swap',
  sendToken: 'send token',
  transfer: 'transfer GLMR'
};

const ERC20_TRANSFER_TOPIC_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const ONE_ETHER = BigNumber.from(1000000000000000000n);

const getAllTx = async (address: string, startBlock: number, endBlock: number): any[] => {
  const res = await axios.get(
    `https://api-moonbeam.moonscan.io/api?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=1QS5VH2CHXPYV5AI8EAQHMR8BWW3DPDV73`
  );

  if (res.data.status !== '1' && res.data.message !== 'No transactions found') {
    console.log(res);
    throw new Error('getAllTx failed ...');
  }

  return res.data.result;
};

const erc20Cache = {};
const getErc20Info = async (address: string): Promise<{ tokenName: string; decimals: string }> => {
  if (erc20Cache[address]) return erc20Cache[address];

  const iface = new Interface(ERC20_ABI);

  const nameData = iface.encodeFunctionData('symbol', []);
  const decimalsData = iface.encodeFunctionData('decimals', []);

  let tokenName = '';
  let decimals = '0';
  try {
    let rawRes = (await eth_call([{ to: address, data: nameData }, 'latest'])).data.result;
    tokenName = iface.decodeFunctionResult('symbol', rawRes).toString();

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
      destination: res[0],
      amount: res[1].div(ONE_ETHER).toBigInt().toString()
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
    amount: BigNumber.from(data)
      .div(BigNumber.from(BigNumber.from(10).pow(decimals)))
      .toString(),
    decimals
  };
};

const getAllData = async (address: string) => {
  const curBlock = await provider.getBlockNumber();
  const allTx = await getAllTx(address, MOONBEAM_START_BLOCK, curBlock);

  const allInfo = await Promise.all(
    allTx
      .filter((tx) => tx.txreceipt_status === '1')
      // .filter((tx) => !tx.functionName.includes('approve'))
      // .filter(tx => tx.hash === '0xc3227369c88ea9d61376c90059747b3de1c37ee748722f2d474423a2ce194f8a')
      .map(async (tx) => {
        let res = {
          blockNumber: tx.blockNumber,
          hash: tx.hash,
          nonce: tx.nonce,
          value: BigNumber.from(tx.value).div(ONE_ETHER),
          from: tx.from,
          to: tx.to,
          input: tx.input,
          methodId: tx.methodId,
          functionName: tx.functionName
        } as any;

        const params = decodeFunctionInput(tx.input, tx.functionName);
        const { tokenName } = await getErc20Info(tx.to);

        if (tx.functionName.includes('swap')) {
          const receipt = await runWithRetries(async () => provider.getTransactionReceipt(tx.hash));
          const transferLogs = receipt.logs.filter((log) => log.topics[0] === ERC20_TRANSFER_TOPIC_SIG);
          const transfers = await Promise.all(transferLogs.map(async (log) => getTransferInfoFromLog(log)));
          res.erc20Transfers = transfers;
          res.action = ACTIONS.swap;
          res.important = 'yes';
          // console.log(transfers);
          // res.logs.forEach(console.log);
        } else if (tx.functionName === 'transfer(address dst, uint256 wad)') {
          res.action = ACTIONS.sendToken;
          res.important = 'yes';
        } else if (tx.functionName === '' && Number(tx.value) > 0) {
          res.action = ACTIONS.transfer;
          res.important = 'yes';
        }

        if (!res.action) {
          res.action = tx.functionName !== '' ? tx.functionName.split('(')[0] : '???';
        }

        return {
          ...res,
          tokenName,
          params
        };
      })
  );

  return allInfo.map((info) => ({
    blockNumber: info.blockNumber,
    hash: info.hash,
    from: info.from,
    to: info.to,
    value: info.value,
    action: info.action,
    important: info.important,
    // transfer
    tokenName: info.tokenName,
    amount: info.params?.amount,
    destination: info.params?.destination,
    // swap
    tokenInName: info.erc20Transfers?.[0]?.tokenName,
    tokenInAmount: info.erc20Transfers?.[0]?.amount,
    tokenInDecimals: info.erc20Transfers?.[0]?.decimals,
    tokenOutName: info.erc20Transfers?.[1]?.tokenName,
    tokenOutAmount: info.erc20Transfers?.[1]?.amount,
    tokenOutDecimals: info.erc20Transfers?.[1]?.decimals
  }));
};

const main = async () => {
  for (const addr of maliciousAddresses) {
    console.log(`checking ${addr} ...`);
    const data = await getAllData(addr);

    console.log(`writing ${data.length} data ...`);
    await csvWriter.writeRecords(data);
    await csvWriter.writeRecords({});
    await csvWriter.writeRecords({});
    await csvWriter.writeRecords({});
    console.log('OK ✔️');
    console.log('');
  }

  // console.log(finalRes)
  // allInfo.forEach(console.log)
  // console.log(JSON.stringify(allInfo, null, 2));
};

main().then(
  () => process.exit(0),
  (e) => {
    console.log(e);
    process.exit(1);
  }
);
