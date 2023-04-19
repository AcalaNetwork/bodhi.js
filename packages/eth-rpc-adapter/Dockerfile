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
RUN yarn workspace @acala-network/eth-rpc-adapter ncc:pack


# =============

FROM node:16-alpine
LABEL maintainer="hello@acala.network"

COPY --from=builder /app/packages/eth-rpc-adapter/dist /app

WORKDIR /app

EXPOSE 8545

USER node

ENV NODE_ENV=production

ENTRYPOINT ["node", "index.js" ]