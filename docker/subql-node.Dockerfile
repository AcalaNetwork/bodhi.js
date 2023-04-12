FROM node:16-alpine as builder
LABEL maintainer="hello@acala.network"

WORKDIR /app

# required to build some native deps
RUN apk add git python3 make gcc g++ musl-dev

# required by some legacy deps
RUN unlink /usr/bin/python && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    ln -s /usr/bin/pip3 /usr/bin/pip

COPY evm-subql /app/evm-subql
WORKDIR /app/evm-subql
RUN yarn && yarn build

# =============

FROM onfinality/subql-node:v1.17.0 as subql-node
LABEL maintainer="hello@acala.network"

WORKDIR /app
COPY --from=builder /app/evm-subql /app
