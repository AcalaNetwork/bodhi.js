import { ApiPromise, WsProvider } from '@polkadot/api';
import { options } from '@acala-network/api';
import { BaseProvider, BaseProviderOptions } from './base-provider';
import { extraRuntimeTypes } from './utils';

const runtime = {
  EVMRuntimeRPCApi: [
    {
      version: 2,
      methods: {
        call: {
          description: 'call evm contract',
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
        },
        create: {
          description: 'create evm contract',
          params: [
            {
              name: 'from',
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
          type: 'Result<CreateInfo, sp_runtime::DispatchError>'
        }
      }
    }
  ]
};

export class EvmRpcProvider extends BaseProvider {
  constructor(endpoint: string | string[], opts?: BaseProviderOptions) {
    super(opts);

    const provider = new WsProvider(endpoint);
    const api = new ApiPromise(
      options({
        provider,
        types: extraRuntimeTypes,
        runtime
      })
    );

    this.setApi(api);
    this.startSubscription() as unknown as void;
  }

  static from(endpoint: string | string[], opt?: BaseProviderOptions): EvmRpcProvider {
    return new EvmRpcProvider(endpoint, opt);
  }
}
