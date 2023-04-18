# =============== eth-rpc-adapter-test =============== #
FROM bodhi-runner as eth-rpc-adapter-test
VOLUME ["/app"]
WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
ENV SUBQL_URL=http://graphql-engine:3001
ENV RPC_URL=http://eth-rpc-adapter-server-with-subql:8545
ENV WS_URL=ws://eth-rpc-adapter-server-with-subql:8545
ENV KARURA_ETH_RPC_URL=http://eth-rpc-adapter-server-karura:8546
CMD yarn e2e:feed-tx; yarn e2e:feed-tx-2; yarn workspace @acala-network/eth-rpc-adapter run test:CI
