# =============== yarn install =============== #
FROM bodhi-runner as yarn-install

VOLUME ["/app"]
WORKDIR /app

ENTRYPOINT yarn install --immutable; yarn workspace @acala-network/evm-subql build
