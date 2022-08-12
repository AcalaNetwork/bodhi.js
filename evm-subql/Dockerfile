FROM node:16-alpine as builder
LABEL maintainer="hello@acala.network"

WORKDIR /app

# required to build some native deps
RUN apk add git python3 make gcc g++ musl-dev

# required by some legacy deps
RUN ln -s /usr/bin/python3 /usr/bin/python && \
    ln -s /usr/bin/pip3 /usr/bin/pip

# install rush. should match version in rush.json
RUN npm install -g @microsoft/rush@5.55.0

COPY . .
RUN rush update

RUN rush build -t @acala-network/eth-providers

WORKDIR /app/evm-subql

RUN yarn && yarn build

# =============

FROM onfinality/subql-node:v1.7.0
LABEL maintainer="hello@acala.network"

WORKDIR /app
COPY --from=builder /app/evm-subql /app
