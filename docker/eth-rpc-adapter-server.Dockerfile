# =============== eth-rpc-adapter =============== #
FROM node:16-alpine as eth-rpc-adapter
WORKDIR /app

### required to build some native deps
RUN apk add git python3 make gcc g++ musl-dev curl

### required by some legacy deps
RUN unlink /usr/bin/python && \
  ln -s /usr/bin/python3 /usr/bin/python && \
  ln -s /usr/bin/pip3 /usr/bin/pip

HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD curl --fail http://localhost:8545 || exit 1

ADD . .

RUN yarn install --immutable

ENTRYPOINT ["yarn", "workspace", "@acala-network/eth-rpc-adapter", "run", "start"]
