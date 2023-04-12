FROM node:16-alpine as bodhi-base
LABEL maintainer="hello@acala.network"

WORKDIR /app

### required to build some native deps
RUN apk add git python3 make gcc g++ musl-dev

### required by some legacy deps
RUN unlink /usr/bin/python && \
  ln -s /usr/bin/python3 /usr/bin/python && \
  ln -s /usr/bin/pip3 /usr/bin/pip

### build base packages
COPY . .

RUN yarn install --immutable
RUN yarn build
RUN yarn build:examples
