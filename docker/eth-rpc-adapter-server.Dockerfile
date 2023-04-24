# =============== eth-rpc-adapter =============== #
FROM bodhi-runner as eth-rpc-adapter

VOLUME ["/app"]
WORKDIR /app

ARG healthcheck_port=8545
ENV HEALTHCHECK_PORT=$healthcheck_port

HEALTHCHECK --interval=10s --timeout=3s --retries=100 --start-period=10s \
  CMD curl --fail http://localhost:${HEALTHCHECK_PORT} || exit 1

ENTRYPOINT yarn workspace @acala-network/eth-rpc-adapter run start $0 $@
