# E2E Tests
## Setup
- install deps and build artifacts
```
yarn
yarn build
```

## For Runtime Upgrade 
- get current latest blocknumber and put it in `subql/{karura,acala}/config.yaml
```
./scripts/block-number.sh
```

- start a full normal-sealing bodhi stack with local karura/acala fork
```
docker compose -f ./docker-compose-karura.yml up
docker compose -f ./docker-compose-acala.yml up
```

- run tests
```
yarn test:karura
yarn test:acala
```

## For Local Mandala Tests
- start a full normal-sealing local mandala stack with subql (node can't be instant sealing if working with subway)
```
docker compose -f ./docker-compose-subway.yml up
```

- run tests
```
yarn test:mandala
```