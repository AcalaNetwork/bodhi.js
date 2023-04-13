# =============== hardhat-tutorials =============== #
FROM bodhi-runner as hardhat-tutorials
VOLUME ["/app"]
WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD yarn install --immutable; yarn build; yarn run test:mandala:ci
