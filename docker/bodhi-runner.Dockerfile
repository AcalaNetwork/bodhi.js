FROM node:16-alpine as bodhi-runner
LABEL maintainer="hello@acala.network"

### required to build some native deps
RUN apk add git python3 make gcc g++ musl-dev curl

### required by some legacy deps
RUN unlink /usr/bin/python && \
  ln -s /usr/bin/python3 /usr/bin/python && \
  ln -s /usr/bin/pip3 /usr/bin/pip
