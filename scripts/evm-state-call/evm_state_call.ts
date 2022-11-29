import { ApiPromise, WsProvider } from '@polkadot/api';
import { options } from '@acala-network/api';
import lookupTypes from '@acala-network/types/interfaces/lookup';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { BigNumber } from 'ethers';
import { Interface } from 'ethers/lib/utils';
import TokenABI from '@acala-network/contracts/build/contracts/Token.json';
import '@polkadot/api-augment';
import '@polkadot/api-augment/substrate/runtime';

const runtime = {
  EVMRuntimeRPCApi: [
    {
      version: 2,
      methods: {
        call: {
          description: 'call evm',
          params: [
            {
              name: 'from',
              type: 'H160'
            },
            {
              name: 'to',
              type: 'H160'
            },
            {
              name: 'data',
              type: 'Vec<u8>'
            },
            {
              name: 'value',
              type: 'Balance'
            },
            {
              name: 'gas_limit',
              type: 'u64'
            },
            {
              name: 'storage_limit',
              type: 'u32'
            },
            {
              name: 'access_list',
              type: 'Option<Vec<EthereumTransactionAccessListItem>>'
            },
            {
              name: 'estimate',
              type: 'bool'
            }
          ],
          type: 'Result<CallInfo, sp_runtime::DispatchError>'
        }
      }
    }
  ]
};

// TODO: `CallInfo` can also stream up to acala.js
const runtimeTypes = {
  CallInfo: {
    exit_reason: 'EvmCoreErrorExitReason',
    value: 'Vec<u8>',
    used_gas: 'U256',
    used_storage: 'i32',
    logs: 'Vec<EthereumLog>'
  },
  ...lookupTypes
};

const eth_call = async (_api: ApiPromise, callRequest: TransactionRequest, at?: string): Promise<string> => {
  const api = at ? await _api.at(at) : _api;

  const { from, to, data, value, gasLimit: ethGasLimit, gasPrice, accessList } = callRequest;

  // TODO: should calculate from eth gas params if present
  const gasLimit = 21000000;
  const storageLimit = 64000;
  const estimate = true;

  const response = await api.call.evmRuntimeRPCApi.call(
    from,
    to,
    data,
    value,
    gasLimit,
    storageLimit,
    accessList,
    estimate
  );

  const res = response.toJSON();
  // console.log(res);
  if (!res.ok) throw new Error('eth call failed: ', res);

  if (res.ok.exit_reason?.succeed) {
    return res.ok.value;
  } else {
    const err = res.ok.exit_reason.error || res.ok.exit_reason.revert || res.ok.exit_reason.fatal || 'unknow error';
    throw new Error(`internal JSON-RPC error: ${JSON.stringify(err)}`);
  }
};

async function main() {
  const provider = new WsProvider('wss://mandala-rpc.aca-staging.network/ws');
  // const provider = new WsProvider('ws://localhost:9944');
  const api = await ApiPromise.create(
    options({
      provider,
      types: runtimeTypes,
      runtime
    })
  );

  const callSig = {
    name: '0x06fdde03',
    symbol: '0x95d89b41',
    decimals: '0x313ce567',
    totalSupply: '0x18160ddd'
  };

  const acaAddr = '0x0000000000000000000100000000000000000000';

  const iface = new Interface(TokenABI.abi);

  console.log('---------- should return correct result ----------');
  for (const [method, sig] of Object.entries(callSig)) {
    const callRequest = {
      to: acaAddr,
      data: sig
    };

    console.log('--- at latest block');
    let rawRes = await eth_call(api, callRequest);
    let res = iface.decodeFunctionResult(method, rawRes)[0];

    console.log(method, BigNumber.isBigNumber(res) ? res.toBigInt() : res);

    console.log('--- at mandala block 12345');
    const block12345 = '0x4a3ad5c6c24e55848c98e5a7d61d02682b506853acd2a10393bc2ac2617e363e';
    rawRes = await eth_call(api, callRequest, block12345);
    res = iface.decodeFunctionResult(method, rawRes)[0];

    console.log(method, BigNumber.isBigNumber(res) ? res.toBigInt() : res);
  }

  console.log('');
  console.log('---------- should revert ----------');
  try {
    const invalidMethod = '0x123456789';
    await eth_call(api, {
      to: acaAddr,
      data: invalidMethod
    });
  } catch (e) {
    console.log(e);
  }

  await api.disconnect();
}

main();

/* 
## raw
0x0000018101000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000054163616c610000000000000000000000000000000000000000000000000000005b5b0000000000000000000000000000000000000000000000000000000000000000000000

## translation
0x
00 [ok]
00 01 [exit reason Succeed => Returned]
8101 [compact encoding of array length]
000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000054163616c61000000000000000000000000000000000000000000000000000000 [value]
5b5b000000000000000000000000000000000000000000000000000000000000 [used_gas U256]
00000000 [used_storage i32]
00 [logs Vec<EthereumLog>]

## correct result (value)
0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000054163616c61000000000000000000000000000000000000000000000000000000
*/
