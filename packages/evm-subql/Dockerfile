FROM node:18-alpine as builder
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

FROM onfinality/subql-node:v6.0.4
LABEL maintainer="hello@acala.network"

# subql node changed defualt user to USER 1000
USER root

COPY --from=builder /app/packages/evm-subql/package.tgz /tmp
RUN tar -xvzf /tmp/package.tgz
RUN mv /package /app
RUN rm -rf /tmp
WORKDIR /app
