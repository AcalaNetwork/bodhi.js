# =============== eth-rpc-adapter =============== #
FROM bodhi-runner as eth-rpc-adapter

VOLUME ["/app"]
WORKDIR /app

HEALTHCHECK --interval=20s --timeout=3s --retries=10 --start-period=10s \
  CMD curl --fail http://localhost:8545 || exit 1

ENTRYPOINT yarn install --immutable; yarn workspace @acala-network/eth-rpc-adapter run start $0 $@
