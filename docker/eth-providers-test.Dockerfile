FROM node:16-alpine as bodhi
LABEL maintainer="hello@acala.network"

WORKDIR /app

### required to build some native deps
RUN apk add git python3 make gcc g++ musl-dev

### required by some legacy deps
RUN ln -s /usr/bin/python3 /usr/bin/python && \
  ln -s /usr/bin/pip3 /usr/bin/pip

### install rush. should match version in rush.json
RUN npm install -g @microsoft/rush@5.55.0

### install all dependencies first before copying in favor of caching
COPY rush.json .
COPY common ./common
COPY bodhi/package.json bodhi/package.json
COPY eth-providers/package.json eth-providers/package.json
COPY eth-rpc-adapter/package.json eth-rpc-adapter/package.json
COPY eth-transactions/package.json eth-transactions/package.json

COPY examples/hardhat-tutorials/hello-world/package.json examples/hardhat-tutorials/hello-world/package.json
COPY examples/hardhat-tutorials/echo/package.json examples/hardhat-tutorials/echo/package.json
COPY examples/hardhat-tutorials/token/package.json examples/hardhat-tutorials/token/package.json
COPY examples/hardhat-tutorials/NFT/package.json examples/hardhat-tutorials/NFT/package.json
COPY examples/hardhat-tutorials/precompiled-token/package.json examples/hardhat-tutorials/precompiled-token/package.json
COPY examples/hardhat-tutorials/DEX/package.json examples/hardhat-tutorials/DEX/package.json
COPY examples/hardhat-tutorials/EVM/package.json examples/hardhat-tutorials/EVM/package.json
COPY examples/hardhat-tutorials/upgradeable-greeter/package.json examples/hardhat-tutorials/upgradeable-greeter/package.json

COPY examples/waffle-tutorials/hello-world/package.json examples/waffle-tutorials/hello-world/package.json
COPY examples/waffle-tutorials/echo/package.json examples/waffle-tutorials/echo/package.json
COPY examples/waffle-tutorials/token/package.json examples/waffle-tutorials/token/package.json
COPY examples/waffle-tutorials/NFT/package.json examples/waffle-tutorials/NFT/package.json
COPY examples/waffle-tutorials/precompiled-token/package.json examples/waffle-tutorials/precompiled-token/package.json

COPY examples/truffle-tutorials/hello-world/package.json examples/truffle-tutorials/hello-world/package.json
COPY examples/truffle-tutorials/echo/package.json examples/truffle-tutorials/echo/package.json
COPY examples/truffle-tutorials/token/package.json examples/truffle-tutorials/token/package.json
COPY examples/truffle-tutorials/NFT/package.json examples/truffle-tutorials/NFT/package.json
COPY examples/truffle-tutorials/precompiled-token/package.json examples/truffle-tutorials/precompiled-token/package.json
COPY examples/truffle-tutorials/DEX/package.json examples/truffle-tutorials/DEX/package.json
COPY examples/truffle-tutorials/EVM/package.json examples/truffle-tutorials/EVM/package.json

COPY examples/waffle/arbitrager/package.json examples/waffle/arbitrager/package.json
COPY examples/waffle/dex/package.json examples/waffle/dex/package.json
COPY examples/waffle/e2e/package.json examples/waffle/e2e/package.json
COPY examples/waffle/erc20/package.json examples/waffle/erc20/package.json
COPY examples/waffle/evm/package.json examples/waffle/evm/package.json
COPY examples/waffle/evm-accounts/package.json examples/waffle/evm-accounts/package.json
COPY examples/waffle/hello-world/package.json examples/waffle/hello-world/package.json
COPY examples/waffle/homa/package.json examples/waffle/homa/package.json
COPY examples/waffle/honzon/package.json examples/waffle/honzon/package.json
COPY examples/waffle/incentives/package.json examples/waffle/incentives/package.json
COPY examples/waffle/oracle/package.json examples/waffle/oracle/package.json
COPY examples/waffle/scheduler/package.json examples/waffle/scheduler/package.json
COPY examples/waffle/uniswap/package.json examples/waffle/uniswap/package.json

RUN rush update

### build base packages
COPY bodhi ./bodhi
COPY eth-providers ./eth-providers
COPY eth-transactions ./eth-transactions
COPY eth-rpc-adapter ./eth-rpc-adapter

RUN rush build \
  -t @acala-network/eth-providers \
  -t @acala-network/bodhi \
  -t @acala-network/eth-rpc-adapter

# =============== eth-providers-test =============== #
FROM node:16-alpine as eth-providers-test
COPY --from=bodhi /app /app

WORKDIR /app
COPY eth-providers ./eth-providers

WORKDIR /app/eth-providers
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["yarn", "test:CI"]
