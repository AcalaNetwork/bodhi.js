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

COPY examples/waffle/arbitrager/package.json examples/waffle/arbitrager/package.json
COPY examples/waffle/dex/package.json examples/waffle/dex/package.json
COPY examples/waffle/e2e/package.json examples/waffle/e2e/package.json
COPY examples/waffle/erc20/package.json examples/waffle/erc20/package.json
COPY examples/waffle/oracle/package.json examples/waffle/oracle/package.json
COPY examples/waffle/hello-world/package.json examples/waffle/hello-world/package.json
COPY examples/waffle/state-rent/package.json examples/waffle/state-rent/package.json
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

# RUN cd evm-subql && yarn build

# =============== feed-tx =============== #
FROM node:16-alpine as feed-tx
COPY --from=bodhi /app /app
RUN npm install -g @microsoft/rush@5.55.0

WORKDIR /app
COPY examples/waffle ./examples/waffle
COPY rush.json .
COPY common ./common

WORKDIR /app/examples/waffle/dex
RUN rush build -o .

ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["yarn", "test"]

# =============== eth-providers-test =============== #
FROM node:16-alpine as eth-providers-test
COPY --from=bodhi /app /app

WORKDIR /app
COPY eth-providers ./eth-providers

WORKDIR /app/eth-providers
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["yarn", "test:CI"]

# =============== subql-node =============== #
FROM onfinality/subql-node:v0.25.4-7 as subql-node
COPY evm-subql /app/evm-subql

WORKDIR /app/evm-subql
RUN yarn
RUN yarn build

# =============== eth-rpc-adapter =============== #
FROM node:16-alpine as eth-rpc-adapter
COPY --from=bodhi /app /app

WORKDIR /app
COPY eth-rpc-adapter ./eth-rpc-adapter

WORKDIR /app/eth-rpc-adapter
ENV ENDPOINT_URL=ws://mandala-node:9944
ENV HTTP_PORT=8545
ENV WS_PORT=3331
CMD ["yarn", "start"]

# =============== eth-rpc-adapter with subql =============== #
FROM node:16-alpine as eth-rpc-adapter-with-subql
COPY --from=bodhi /app /app

WORKDIR /app
COPY eth-rpc-adapter ./eth-rpc-adapter

WORKDIR /app/evm-subql
COPY evm-subql/package.json .
COPY evm-subql/yarn.lock .
RUN yarn

COPY evm-subql .
RUN yarn build

WORKDIR /app/eth-rpc-adapter
ENV ENDPOINT_URL=ws://mandala-node:9944
ENV SUBQL_URL=http://graphql-engine:3001
ENV HTTP_PORT=8545
ENV WS_PORT=3331
CMD ["yarn", "start"]

# =============== eth-rpc-adapter-test =============== #
FROM node:16-alpine as eth-rpc-adapter-test
COPY --from=bodhi /app /app

WORKDIR /app
COPY eth-rpc-adapter ./eth-rpc-adapter

WORKDIR /app/eth-rpc-adapter
ENV ENDPOINT_URL=ws://mandala-node:9944
ENV SUBQL_URL=http://graphql-engine:3001
ENV RPC_URL=http://eth-rpc-adapter-server-with-subql:8545
CMD ["yarn", "test:CI"]

# =============== waffle-examples =============== #
FROM node:16-alpine as waffle-examples
COPY --from=bodhi /app /app
RUN apk add bash
RUN npm install -g @microsoft/rush@5.55.0

WORKDIR /app
COPY examples/waffle ./examples/waffle
COPY rush.json .
COPY common ./common

WORKDIR /app/examples/waffle
RUN chmod 777 run.sh
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["/bin/bash", "run.sh", "build_and_test"]

# =============== waffle-tutorials =============== #
FROM node:16-alpine as waffle-tutorials
COPY --from=bodhi /app /app
RUN apk add bash
RUN npm install -g @microsoft/rush@5.55.0

WORKDIR /app
COPY examples/waffle-tutorials examples/waffle-tutorials
COPY rush.json .
COPY common ./common

WORKDIR /app/examples/waffle-tutorials
RUN chmod 777 run.sh
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["/bin/bash", "run.sh", "build_and_test"]

# =============== hardhat-tutorials =============== #
FROM node:16-alpine as hardhat-tutorials
COPY --from=bodhi /app /app
RUN apk add bash
RUN npm install -g @microsoft/rush@5.55.0

WORKDIR /app
COPY examples/hardhat-tutorials examples/hardhat-tutorials
COPY rush.json .
COPY common ./common

# ~~~~~~~~~~ TODO: ~~~~~~~~~ #
# yarn overrides is a temp workaround for incompatible packages
# can remove this chunk after upgrading bodhi to latest packages

COPY .git ./.git
RUN apk add git

WORKDIR /app/examples/hardhat-tutorials/hello-world
RUN rm -rf node_modules && yarn cache clean && yarn install
WORKDIR /app/examples/hardhat-tutorials/echo
RUN rm -rf node_modules && yarn cache clean && yarn install
WORKDIR /app/examples/hardhat-tutorials/token
RUN rm -rf node_modules && yarn cache clean && yarn install
WORKDIR /app/examples/hardhat-tutorials/NFT
RUN rm -rf node_modules && yarn cache clean && yarn install
WORKDIR /app/examples/hardhat-tutorials/precompiled-token
RUN rm -rf node_modules && yarn cache clean && yarn install
WORKDIR /app/examples/hardhat-tutorials/DEX
RUN rm -rf node_modules && yarn cache clean && yarn install

# ~~~~~~~~ end todo ~~~~~~~~ #

WORKDIR /app/examples/hardhat-tutorials
RUN chmod 777 run.sh
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["/bin/bash", "run.sh", "CI_build_and_test"]

# =============== truffle-tutorials =============== #
FROM node:16-alpine as truffle-tutorials
COPY --from=bodhi /app /app
RUN apk add bash
RUN npm install -g @microsoft/rush@5.55.0

WORKDIR /app
COPY examples/truffle-tutorials examples/truffle-tutorials
COPY rush.json .
COPY common ./common

WORKDIR /app/examples/truffle-tutorials
RUN chmod 777 run.sh
CMD ["/bin/bash", "run.sh", "CI_build_and_test"]
