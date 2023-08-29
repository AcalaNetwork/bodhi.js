# @acala-network/eth-providers
This package includes two providers, and both of their APIs are mostly compatible with ethers.js [JsonRpcProvider](https://docs.ethers.io/v5/single-page/#/v5/api/providers/jsonrpc-provider/-%23-JsonRpcProvider).

 - **AcalaJsonRpcProvider**: used as a drop-in replacement for `ethers.JsonRpcProvider` to interact with EVM+ via [ETH JSON-RPC](https://ethereum.org/en/developers/docs/apis/json-rpc/).
 - **EvmRpcProvider**: used internally by [eth-rpc-adapter](../eth-rpc-adapter). It connects to a node via substrate node url, instead of eth json-rpc.

In many cases using `ethers.JsonRpcProvider` also works with EVM+, in particularly all **read operations**, such as getting receipts, logs, block data, etc. However, we can't use it to **send transactions**, which will throw `tx hash not match` error. In such case we can use `AcalaJsonRpcProvider` instead.

## Getting Started
### install
```
yarn add @acala-network/eth-providers
# or 
npm install @acala-network/eth-providers
```

### create a provider instance 
- **AcalaJsonRpcProvider**

`AcalaJsonRpcProvider` matches all APIs of `ethers.JsonRpcProvider`, so you can use it as a drop-in replacement, and interact with EVM+ via ETH RPC. **This is the preferred way**.
```ts
import { AcalaJsonRpcProvider } from "@acala-network/eth-providers";

// https://evmdocs.acala.network/network/network-configuration#karura-mainnet
const KARURA_ETH_RPC= 'https://eth-rpc-karura.aca-api.network';

const provider = new AcalaJsonRpcProvider(KARURA_ETH_RPC);
```

- **EvmRpcProvider**

If you wish to communicate with EVM+ by websocket and substrate node url, instead of via ETH RPC, you can do this by using `EvmRpcProvider`.
```ts
import { EvmRpcProvider } from "@acala-network/eth-providers";

const KARURA_NODE_URL = 'wss://karura-rpc.aca-api.network';
const KARURA_SUBQL_URL = 'https://subql-query-karura.aca-api.network';

const provider = new EvmRpcProvider(
  KARURA_NODE_URL,
  { subqlUrl: KARURA_SUBQL_URL },
);
await provider.isReady();
```

### use the provider
You can use the provider similar to how you will use `ethers.JsonRpcProvider`

```ts
// get some info
const chainId = await provider.chainId();
const curBlock = await provider.getBlockNumber();
const balance = await provider.getBalance('0x1c3D657F0518A094BF351852bad4285EFc0D5Ce9');
const blockData = await provider.getBlockData('latest', false);

// send transaction
const wallet = new Wallet(PRIVATE_KEY, provider);
const contractInstance = new Contract(CONTRACT_ADDR, CONTRACT_ABI, wallet);
await contractInstance.someMethod();
```
