# =============== waffle-examples =============== #
FROM bodhi-runner AS waffle-examples
VOLUME ["/app"]
WORKDIR /app
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD yarn run test:waffle
