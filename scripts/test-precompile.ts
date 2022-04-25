import axios from 'axios';
// import { expect } from 'chai';
import dotenv from 'dotenv';
import { parseUnits, Interface } from 'ethers/lib/utils';
import ACAABI from '@acala-network/contracts/build/contracts/Token.json';
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

(async () => {
  const ACA_ADDRESS = '0x0000000000000000000100000000000000000000';
  const res = eth_call();

  const iface = new Interface(ACAABI.abi);

  // const funcs = ACAABI.abi.filter(a => a.type === 'function' && a.inputs.length === 0).map(x => x.name);
  const funcs = [
    'symbol'
    // 'decimals',
  ];

  funcs.forEach(async (f) => {
    const data = iface.encodeFunctionData(f);
    const blockNumber = (await eth_blockNumber()).data.result;
    const res = await eth_call([
      {
        to: ADDRESS.ACA,
        data
      },
      blockNumber
    ]);

    const decodedData = iface.decodeFunctionResult(f, res.data.result)[0];
    console.log(f, data, decodedData);
  });
})();
