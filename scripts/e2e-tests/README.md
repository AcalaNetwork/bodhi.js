# E2E Tests
## Setup
- install deps and build artifacts
```
yarn
yarn build
```

## For Runtime Upgrade 
- start a karura/acala fork
```
npx @acala-network/chopsticks@latest -c configs/karura.yml
npx @acala-network/chopsticks@latest -c configs/acala.yml
```

- start a eth rpc adapter
```
npx @acala-network/eth-rpc-adapter@latest -e ws://localhost:8000
```

- run tests
```
yarn test:karura
yarn test:acala
```

## For Local Mandala Tests
- start a full normal-sealing local mandala stack with subql (node can't be instant sealing if working with subway)
```
docker compose
```

- run tests
```
yarn test:mandala
```