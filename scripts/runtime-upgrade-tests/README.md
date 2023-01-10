# Runtime Upgrade ETH RPC Tests
## Setup
- start a karura/acala fork
```
npx @acala-network/chopsticks dev --import-storage=storage.json --config=configs/karura.yml
```

- do a runtime upgrade to the desired version by `sudo.setCode(newRuntimeWasm)`
- start a eth rpc adapter
```
npx @acala-network/eth-rpc-adapter@2.5.9 -l -e ws://localhost:8000
```

## Run Tests
- install deps and build artifacts
```
yarn
yarn build
```

- run tests
```
yarn test:karura
```
