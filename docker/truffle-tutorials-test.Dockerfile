# =============== truffle-tutorials =============== #
FROM bodhi-runner as truffle-tutorials
VOLUME ["/app"]
WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD yarn install --immutable; yarn run test:mandala:ci
