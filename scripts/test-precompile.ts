import axios from 'axios';
// import { expect } from 'chai';
import dotenv from 'dotenv';
import { parseUnits, Interface } from 'ethers/lib/utils';
import tokenAbi from '@acala-network/contracts/build/contracts/Token.json';
import ADDRESS from '@acala-network/contracts/utils/Address';

dotenv.config();

const MANDALA_TESTNET_RPC = 'https://tc7-eth.aca-dev.network';
const RPC_URL = process.env.RPC_URL || MANDALA_TESTNET_RPC;

const rpcGet =
  (method: string) =>
  (params: any): any =>
    axios.get(RPC_URL, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method,
        params
      }
    });

const eth_call = rpcGet('eth_call');
const eth_blockNumber = rpcGet('eth_blockNumber');

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

(async () => {
  const funcs = ['name', 'symbol', 'decimals'];

  const queries = [];
  const allInfo = {};

  for (const token of TOKENS) {
    allInfo[token] = { token };

    const blockNumber = (await eth_blockNumber()).data.result;

    queries.push(
      ...funcs.map(async (f) => {
        const data = iface.encodeFunctionData(f);
        try {
          const res = await eth_call([
            {
              to: ADDRESS[token],
              data
            },
            blockNumber
          ]);

          const decodedData = iface.decodeFunctionResult(f, res.data.result)[0];
          allInfo[token][f] = decodedData;
        } catch (error) {
          console.log(error);
          allInfo[token][f] = 'failed to fetch';
        }
      })
    );
  }

  await Promise.all(queries);
  console.log(allInfo);
})();
