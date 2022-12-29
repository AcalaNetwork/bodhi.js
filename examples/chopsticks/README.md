# Bodhi Examples - Chopsticks
This example demonstrates how to use [chopsticks](https://github.com/AcalaNetwork/chopsticks) to fork a substrate network, override it's storage, and test EVM+ transactions in parallel reality.

## Setup
### prepare storage override
One advantage of chopsticks is that we can override storage to test more conveniently. 

Suppose we want to impersonate a big whale calling a contract, we can achieve this by doing the following storage overrides:
- set Alice's balance to `1000000000000000`, whose address is `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`.
- bind a ETH address to Alice, so Alice's balance will sync to it, now this ETH address becomes the whale! The random eth address we choose here is `0xEE1b6e72FC5bC8738150B6bE7564DA887723cCA1` whose private key is `0x8d2d614677b99ee1809eec0967d538f43d3f410e20ee5f5b979dd21d5930d3fe`.

Create a `storage.json` that looks like this:
```json
{
  "System": {
    "Account": [
      [
        ["5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"],
        {
          "data": { "free": 1000000000000000 }
        }
      ]
    ]
  },
  "EvmAccounts": {
    "EvmAddresses": [
      [
        ["5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"],
        "0xEE1b6e72FC5bC8738150B6bE7564DA887723cCA1"
      ]
    ],
    "Accounts": [
      [
        ["0xee1b6e72fc5bc8738150b6be7564da887723cca1"],
        "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
      ]
    ]
  }
}
```

### run chopsticks
run the following command in the same folder with `storage.json`
```
yarn dlx @acala-network/chopsticks dev \
  --endpoint wss://mandala-rpc.aca-staging.network/ws \
  --import-storage=storage.json
```

alternatively if you want to clone and build chopsticks yourself
```
git clone --recurse-submodules https://github.com/AcalaNetwork/chopsticks.git && cd chopsticks
yarn
yarn build-wasm
yarn start dev \
  --endpoint wss://mandala-rpc.aca-staging.network/ws \
  --import-storage=storage.json
```

Now we should have a local fork of mandala running at `ws://localhost:8000`. **All state changes are local**, so we can do arbitrary experiment, without affecting the acutal public network.

## Run the demo script
It's recommended to get familiar with the [echo contract](https://github.com/AcalaNetwork/hardhat-tutorials/tree/master/echo) before diving into the script.

```
yarn
yarn start
```

We will see that in the initial state:
- echo contract local state is the same as the public mandala, since chopsticks forks the state.
- balance of the eth address is 0 on public mandala, since it's a random address. However, it has balance on local fork, since we have overridden the state.
```
------------------------ initial state ------------------------
msg from public mandala:       [hello from echo at public mandala]
msg from local mandala fork:   [hello from echo at public mandala]
balance on public mandala:     [0]
balance on local mandala fork: [1000000000000000000000]
---------------------------------------------------------------
```

And after calling `scream()`, which changes the contract state:
- local state is updated, and public mandala state is unaffected
- local balance is updated, and public mandala balance is unaffected
```
------------------------ after calling scream() ------------------------
msg from public mandala:       [hello from echo at public mandala]
msg from local mandala fork:   [new msg from local mandala]
balance on public mandala:     [0]
balance on local mandala fork: [999987553308653000000]
---------------------------------------------------------------
```

## Run with other tools
To test with others tools, such as hardhat and truffle, we can run an [eth rpc adapter](https://github.com/AcalaNetwork/bodhi.js/tree/master/eth-rpc-adapter) along with chopsticks, then run scripts normally. All transactions submitted to `http://localhost:8545` will be handled by chopsticks locally.
```
cd ../../eth-rpc-adapter/
rush update
rush build -t .
yarn start -l -e ws://localhost:8000
```