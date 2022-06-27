# =============== eth-rpc-adapter =============== #
FROM node:16-alpine as eth-rpc-adapter
COPY --from=bodhi-base /app /app

WORKDIR /app
COPY eth-rpc-adapter ./eth-rpc-adapter

WORKDIR /app/eth-rpc-adapter
ENV ENDPOINT_URL=ws://mandala-node:9944
ENV HTTP_PORT=8545
ENV WS_PORT=3331
ENV LOCAL_MODE=1
CMD ["yarn", "start"]

# =============== hardhat-tutorials =============== #
FROM node:16-alpine as hardhat-tutorials
COPY --from=bodhi-base /app /app
RUN apk add bash
RUN npm install -g @microsoft/rush@5.55.0

WORKDIR /app
COPY examples/hardhat-tutorials examples/hardhat-tutorials
COPY rush.json .
COPY common ./common

WORKDIR /app/examples/hardhat-tutorials
RUN chmod 777 run.sh
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["/bin/bash", "run.sh", "CI_build_and_test"]
