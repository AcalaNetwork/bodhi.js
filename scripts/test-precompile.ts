import { parseUnits, Interface } from 'ethers/lib/utils';
import tokenAbi from '@acala-network/contracts/build/contracts/Token.json';
import evmAbi from '@acala-network/contracts/build/contracts/EVM.json';
import oracleAbi from '@acala-network/contracts/build/contracts/Oracle.json';
import ADDRESS from '@acala-network/contracts/utils/MandalaAddress';
import { eth_call, eth_blockNumber } from './utils';

const TOKENS = [
  'ACA',
  'AUSD',
  'DOT',
  'LDOT',
  'RENBTC',
  'CASH',
  'KAR',
  'KUSD',
  'KSM',
  'LKSM',
  'TAI',
  'BNC',
  'VSKSM',
  'PHA',
  'KINT',
  'KBTC'
];
const iface = new Interface(tokenAbi.abi);
const ifaceEVM = new Interface(evmAbi.abi);
const ifaceOracle = new Interface(oracleAbi.abi);

const getAllTokenInfo = async () => {
  const funcs = ['name', 'symbol', 'decimals', 'totalSupply'];
  const queries = [];
  const allInfo = {};

  const blockNumber = (await eth_blockNumber()).data.result;

  for (const token of TOKENS) {
    allInfo[token] = { token };

    queries.push(
      ...funcs.map(async (f) => {
        const data = iface.encodeFunctionData(f);
        allInfo[token]['address'] = ADDRESS[token];

        try {
          const res = await eth_call([
            {
              to: ADDRESS[token],
              data
            },
            blockNumber
          ]);

          const decodedData = iface.decodeFunctionResult(f, res.data.result)[0];
          allInfo[token][f] = decodedData._isBigNumber ? decodedData.toBigInt() : decodedData;
        } catch (error) {
          // console.log(error);
          allInfo[token][f] = 'failed to fetch';
        }
      })
    );
  }

  await Promise.all(queries);
  console.log(allInfo);
};

const getDEXInfo = async () => {
  const funcs = ['newContractExtraBytes', 'storageDepositPerByte', 'developerDeposit', 'publicationFee'];
  const allInfo = {};

  const blockNumber = (await eth_blockNumber()).data.result;

  const queries = funcs.map(async (f) => {
    const data = ifaceEVM.encodeFunctionData(f);
    try {
      const res = await eth_call([
        {
          to: ADDRESS.EVM,
          data
        },
        blockNumber
      ]);

      const decodedData = ifaceEVM.decodeFunctionResult(f, res.data.result)[0];
      allInfo[f] = decodedData._isBigNumber ? decodedData.toBigInt() : decodedData;
    } catch (error) {
      console.log(error);
      allInfo[f] = 'failed to fetch';
    }
  });

  await Promise.all(queries);
  console.log({ DEX: allInfo });
};

const getOracleInfo = async () => {
  const allInfo = {};

  const blockNumber = (await eth_blockNumber()).data.result;

  const queries = TOKENS.map(async (name) => {
    const addr = ADDRESS[name];
    const data = ifaceOracle.encodeFunctionData('getPrice', [addr]);
    try {
      const res = await eth_call([
        {
          to: ADDRESS.Oracle,
          data
        },
        blockNumber
      ]);

      const decodedData = ifaceOracle.decodeFunctionResult('getPrice', res.data.result)[0];
      allInfo[name] = decodedData._isBigNumber ? decodedData.toBigInt() : decodedData;
    } catch (error) {
      console.log(error);
      allInfo[name] = 'failed to fetch';
    }
  });

  await Promise.all(queries);
  console.log({ OraclePrices: allInfo });
};

getAllTokenInfo();
getDEXInfo();
getOracleInfo();
