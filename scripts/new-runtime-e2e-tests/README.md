# Runtime Upgrade E2E Tests
## Setup
- start a karura/acala fork
```
npx @acala-network/chopsticks@latest -c configs/karura.yml
npx @acala-network/chopsticks@latest -c configs/acala.yml
```

- start a eth rpc adapter
```
npx @acala-network/eth-rpc-adapter@2.7.7 -e ws://localhost:8000
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
