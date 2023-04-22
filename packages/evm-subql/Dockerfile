FROM node:16-alpine as builder
LABEL maintainer="hello@acala.network"

WORKDIR /app

# required to build some native deps
RUN apk add git python3 make gcc g++ musl-dev

# required by some legacy deps
RUN unlink /usr/bin/python && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    ln -s /usr/bin/pip3 /usr/bin/pip


COPY . .
RUN yarn install --immutable
RUN yarn workspace @acala-network/evm-subql pack

# =============

FROM onfinality/subql-node:v1.17.0
LABEL maintainer="hello@acala.network"

COPY --from=builder /app/packages/evm-subql/package.tgz /tmp
RUN tar -xvzf /tmp/package.tgz
RUN mv /package /app
RUN rm -rf /tmp
WORKDIR /app