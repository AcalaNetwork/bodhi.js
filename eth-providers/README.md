# @acala-network/eth-providers
This package includes two providers:

**EvmRpcProvider**
It is an abstract connection to EVM+, the APIs is mostly compatible with ethers.js [JsonRpcProvider](https://docs.ethers.io/v5/single-page/#/v5/api/providers/jsonrpc-provider/-%23-JsonRpcProvider). It is used internally by [eth-rpc-adapter](../eth-rpc-adapter) to provide standard [ETH JSON-RPC](https://ethereum.org/en/developers/docs/apis/json-rpc/), which is the preferred way to interact with EVM+. 

**SignerProvider**
It is similar to `EvmRpcProvider`, but mostly used by [bodhi signer](../bodhi/).

## Getting Started
As mentioned above, the [ETH JSON-RPC](https://ethereum.org/en/developers/docs/apis/json-rpc/) is more common way to interact with EVM+. So in most cases we don't use the provider directly, but if you do need to, below are some examples.

### install
```
yarn add @acala-network/eth-providers
### or 
npm install @acala-network/eth-providers
```

### create a provider instance 
```ts
import { EvmRpcProvider } from "@acala-network/eth-providers";

const KARURA_NODE_ENDPOINT = 'wss://karura-rpc-0.aca-api.network';
const KARURA_SUBQL_URL = 'https://subql-query-karura.aca-api.network';

const provider = new EvmRpcProvider(
  KARURA_NODE_ENDPOINT,
  { subqlUrl: KARURA_SUBQL_URL },   // optional
);
await provider.isReady();
```

### use the provider
some method doesn't rely on subquery, so `subqlUrl` is **optional**
```ts
const chainId = await provider.chainId();
const curBlock = await provider.getBlockNumber();
const balance = await provider.getBalance('0x1c3D657F0518A094BF351852bad4285EFc0D5Ce9');
const blockData = await provider.getBlockData('latest', false);
```

if we need to get historical logs and receipt, `subqlUrl` is **required**
```ts
const fullBlockData = await provider.getBlockData('latest', true);
const recepit = await provider.getTXReceiptByHash('0xa82791bb02323ead8caa02adadd9fa2fde015d81bc170e5fd484306d060d016e');
const logs = await provider.getLogs({
  blockHash: '0xd24265fa4cc387810ba2378c816142f65cb6a3c98bc8a6e206e294d8b50f6a21',
});

await provider.disconnect();
```
for a full list of available methods, please checkout the [source code](./src/base-provider.ts)