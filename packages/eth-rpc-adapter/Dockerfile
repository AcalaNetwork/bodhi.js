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
RUN yarn build


# =============

FROM node:18-alpine
LABEL maintainer="hello@acala.network"

COPY --from=builder /app/package.json /app/.yarnrc.yml /app/
COPY --from=builder /app/node_modules /app/node_modules

COPY --from=builder /app/packages/eth-rpc-adapter/package.json /app/packages/eth-rpc-adapter/package.json
COPY --from=builder /app/packages/eth-transactions/package.json /app/packages/eth-transactions/package.json
COPY --from=builder /app/packages/eth-providers/package.json /app/packages/eth-providers/package.json

COPY --from=builder /app/packages/eth-rpc-adapter/lib /app/packages/eth-rpc-adapter/lib
COPY --from=builder /app/packages/eth-transactions/lib /app/packages/eth-transactions/lib
COPY --from=builder /app/packages/eth-providers/lib /app/packages/eth-providers/lib

COPY --from=builder /app/packages/eth-rpc-adapter/node_modules /app/packages/eth-rpc-adapter/node_modules
COPY --from=builder /app/packages/eth-transactions/node_modules /app/packages/eth-transactions/node_modules
# COPY --from=builder /app/packages/eth-providers/node_modules /app/packages/eth-providers/node_modules     # don't exist

WORKDIR /app/packages/eth-rpc-adapter

EXPOSE 8545

USER node

ENV NODE_ENV=production

ENTRYPOINT ["node", "lib/index.js"]