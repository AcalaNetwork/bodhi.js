# =============== eth-providers-test =============== #
FROM node:16-alpine as eth-providers-test
WORKDIR /app

### required to build some native deps
RUN apk add git python3 make gcc g++ musl-dev curl

### required by some legacy deps
RUN unlink /usr/bin/python && \
  ln -s /usr/bin/python3 /usr/bin/python && \
  ln -s /usr/bin/pip3 /usr/bin/pip

ADD . .

RUN yarn install --immutable
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["yarn", "run", "test"]
