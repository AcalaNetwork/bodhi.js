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

WORKDIR /app/eth-rpc-adapter

RUN rush build -t .
RUN yarn build

# =============

FROM node:16-alpine

COPY --from=builder /app /app

WORKDIR /app/eth-rpc-adapter

EXPOSE 8545

USER node

ENV NODE_ENV=production

CMD ["yarn", "start"]