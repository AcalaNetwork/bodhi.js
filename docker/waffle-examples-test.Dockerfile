# =============== waffle-examples =============== #
FROM bodhi-runner as waffle-examples
VOLUME ["/app"]
WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD yarn install --immutable; yarn run test:examples
