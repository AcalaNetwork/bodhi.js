# Runtime Upgrade ETH RPC Tests
## Setup
- start a karura/acala fork
```
npx @acala-network/chopsticks@latest dev \
  --import-storage=configs/storage.json \
  --endpoint=wss://karura-rpc-3.aca-api.network/ws

npx @acala-network/chopsticks@latest dev \
  --import-storage=configs/storage.json \
  --endpoint=wss://acala-rpc-3.aca-api.network/ws
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
yarn test:acala
```
