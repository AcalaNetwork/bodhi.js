# Bodhi Examples - Chopsticks
This example demonstrates how to use [chopsticks](https://github.com/AcalaNetwork/chopsticks) to fork Acala mainnet, override it's storage, and test EVM+ transactions in parallel reality.

## Setup local acala fork with chopsticks
- run a local fork of Acala (use `npx` or `yarn dlx` if you prefer these over `bunx`)
```
bunx @acala-network/chopsticks@latest -c https://raw.githubusercontent.com/AcalaNetwork/chopsticks/master/configs/acala.yml
```

Now we should have a local fork of acala running at `ws://localhost:8000`. **All state changes are local**, so we can do arbitrary experiment, without affecting the acutal public network.

- run an [eth rpc adapter](https://evmdocs.acala.network/tooling/rpc-adapter) to provide local eth rpc interface at `localhost:8545`
```
bunx @acala-network/eth-rpc-adapter@latest -e ws://localhost:8000
```

### about storage override
One advantage of chopsticks is that we can override storage to test more conveniently. In the above setup, we did a couple storage overrides under the hood:
- set Alice's balance to `1000000000000000`, whose address is `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` [here](https://github.com/AcalaNetwork/chopsticks/blob/master/configs/acala.yml#L14-L19)
- bind test evm account `0x75E480dB528101a381Ce68544611C169Ad7EB342` to Alice, so this evm account syncs Alice's balance [here](https://github.com/AcalaNetwork/chopsticks/blob/master/configs/acala.yml#L75-L81). Now we will never need to worry about any fees since we are now big whale!

## Run the demo script
It's recommended to get familiar with the [echo contract](https://github.com/AcalaNetwork/hardhat-tutorials/tree/master/echo) before diving into the script.

```
yarn
yarn start
```

We will see that in the initial state:
- echo contract local state is the same as the public acala, since chopsticks forks the state.
- balance of the eth address is 0 on public acala, since it's a test account that isn't used on mainnet. However, it has balance on local fork, since we have overridden the state.
```
------------------------ initial state ------------------------
msg from acala:              [greetings from acala mainnet!]
msg from local acala fork:   [greetings from acala mainnet!]
balance on acala:            [0]
balance on local acala fork: [1000000000000000000000]
---------------------------------------------------------------
```

And after calling `scream()`, which changes the contract state:
- local state is updated, and public acala state is unaffected
- local balance is updated, and public acala balance is unaffected
```
------------------------ after calling scream() ------------------------
msg from acala:              [greetings from acala mainnet!]
msg from local acala fork:   [new msg from local acala]
balance on acala:            [0]
balance on local acala fork: [999996579991919000000]
---------------------------------------------------------------
```

## Note
In this local setup, one of the eth rpc `eth_getLogs` won't work. In order for that to work, we needs either:
- setup a full bodhi stack with subquery, and with chopsticks, this is a little tricky. Please contact Acala team for supporting if you need it.
- until [this issue](https://github.com/AcalaNetwork/bodhi.js/issues/901) is resolved.