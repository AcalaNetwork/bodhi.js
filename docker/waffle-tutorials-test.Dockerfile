# =============== waffle-tutorials =============== #
FROM node:16-alpine as waffle-tutorials
COPY --from=bodhi-base /app /app

### required to build some native deps
RUN apk add git python3 make gcc g++ musl-dev

### required by some legacy deps
RUN unlink /usr/bin/python && \
  ln -s /usr/bin/python3 /usr/bin/python && \
  ln -s /usr/bin/pip3 /usr/bin/pip

COPY examples/waffle-tutorials /examples/waffle-tutorials

WORKDIR /examples/waffle-tutorials
RUN yarn install
RUN yarn build
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["yarn", "run", "test:mandala:ci"]
