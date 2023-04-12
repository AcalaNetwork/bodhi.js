# =============== feed-tx =============== #
FROM node:16-alpine as feed-tx
COPY --from=bodhi-base /app /app

WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["yarn", "workspace", "evm-waffle-example-dex", "run", "test"]

# =============== feed-tx-dex-erc20 =============== #
FROM node:16-alpine as feed-tx-dex-erc20
COPY --from=bodhi-base /app /app

WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["yarn", "workspace", "evm-waffle-example-e2e", "run", "test-dex"]

# =============== eth-rpc-adapter-test =============== #
FROM node:16-alpine as eth-rpc-adapter-test
COPY --from=bodhi-base /app /app

WORKDIR /app

ENV ENDPOINT_URL=ws://mandala-node:9944
ENV SUBQL_URL=http://graphql-engine:3001
ENV RPC_URL=http://eth-rpc-adapter-server-with-subql:8545
ENV WS_URL=ws://eth-rpc-adapter-server-with-subql:8545
ENV KARURA_ETH_RPC_URL=http://eth-rpc-adapter-server-karura:8546
CMD ["yarn", "workspace", "@acala-network/eth-rpc-adapter", "run", "test:CI"]
