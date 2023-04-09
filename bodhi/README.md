# @acala-network/bodhi.js
bodhi.js SDK provides utils for interaction with [Acala EVM+](https://evmdocs.acala.network/general/about-acala-evm+):
- a `BodhiProvider` that extends `ethers.js` [Provider](https://docs.ethers.io/v5/single-page/#/v5/api/providers/provider/-%23-Provider)
- a `BodhiSigner` that extends `ethers.js` [Signer](https://docs.ethers.io/v5/single-page/#/v5/api/signer/-%23-Signer)

## Getting Started
### install
```
yarn add @acala-network/bodhi
# or
npm install @acala-network/bodhi
```

### create a wallet
```ts
import { WsProvider } from "@polkadot/api";
import { createTestPairs } from "@polkadot/keyring/testingPairs";
import { SubstrateSigner, BodhiProvider, BodhiSigner } from "@acala-network/bodhi";

const provider = new BodhiProvider({
  provider: new WsProvider("ws://localhost:9944")
});

// create a substrate payload signer, dapps will use an extension signer
const { alice } = createTestPairs();
const signer = new SubstrateSigner(provider.api.registry, alice);

const wallet = new BodhiSigner(provider, alice.address, signer);
// or from pair
const wallet = BodhiSigner.fromPair(provider, alice);
```

alternatively, for a quick testing setup, we can use the `getTestUtils` helper, which basically encapsulates the above setup.
```ts
import { getTestUtils } from '@acala-network/bodhi';
const { wallets, provider, pairs } = await getTestUtils('ws://localhost:9944');
const alice = pairs[0];
const wallet = wallets[0];
```

### use the wallet
now that we have an eth compatible wallet (signer), we can use it with any eth toolings. 

For example we can use it with `waffle` to deploy a contract
```ts
import { deployContract } from "ethereum-waffle";
const instance = await deployContract(wallet, contractAbi, params);
```

or use with `ethers` to interact with existing contracts
```ts
const instance = new ethers.Contract(address, contractAbi, wallet);
await instance.callSomeFunction();
```

## Concepts
You may notice there are so many "providers" and "signers", basically there are two from substrate world (`WsProvider`, `SubstrateSigner`), and two from traditional eth world (`Signer`, `Provider`).

Here is a brief hierachy of how they work together:

- `BodhiSigner`: top level eth signer (wallet), compatible with ethers.js AbstractSigner, can be directly used by any eth toolings, such as ethers, waffle, etc.
  - `SubstrateSigner`: substrate payload signer, usually from keyring pair or an extension wallet, such as polkadotjs or talisman
  - `Provider` (BodhiProvider): eth provider for eth related communications, mostly compatible with ethers.js AbstractProvider
    - `WsProvider`: provides websocket connection with substrate based chains, used by BodhiProvider internally
  

TODO: maybe a graph is better.

## Evm+ Specific Features
besides classic signer methods, we have some additional features available only for Evm+. For a comprehensive list please checkout [here](./src/BodhiSigner.ts)
```ts
await wallet.claimEvmAccounts(evmAddress);  // bind an evm address to the signer substrate address
await wallet.claimDefaultAccount();         // bind default evm address to the signer substrate address
wallet.computeDefaultEvmAddress();          // you know it
await wallet.queryEvmAddress();             // Get the signers EVM address if it has claimed one.
```

## Examples
Checkout [bodhi-examples](https://github.com/AcalaNetwork/bodhi-examples) for some real apps that integrate bodhi signers, with some extra cool features (such as batch transactions).