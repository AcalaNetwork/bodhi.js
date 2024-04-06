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

FROM subquerynetwork/subql-node-substrate:v3.10.1
LABEL maintainer="hello@acala.network"

# subql node changed defualt user to USER 1000
USER root

COPY --from=builder /app/packages/evm-subql/package.tgz /tmp
RUN tar -xvzf /tmp/package.tgz
RUN mv /package /app
RUN rm -rf /tmp
WORKDIR /app

# has to override entry point for now
# https://github.com/subquery/subql/pull/2344
ENTRYPOINT ["/sbin/tini", "--", "/bin/run"],