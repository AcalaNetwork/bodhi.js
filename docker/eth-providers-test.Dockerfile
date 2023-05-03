# =============== eth-providers-test =============== #
FROM bodhi-runner as eth-providers-test

VOLUME ["/app"]
WORKDIR /app

ENV ENDPOINT_URL=ws://mandala-node:9944
ENV ETH_RPC=http://eth-rpc-adapter-server:8545
CMD yarn install --immutable; yarn e2e:feed-tx; yarn workspace @acala-network/eth-providers run test:CI
