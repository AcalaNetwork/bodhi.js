# =============== truffle-tutorials =============== #
FROM node:16-alpine as truffle-tutorials
COPY --from=bodhi-base /app /app
RUN apk add bash
RUN npm install -g @microsoft/rush@5.55.0

WORKDIR /app
COPY examples/truffle-tutorials examples/truffle-tutorials

WORKDIR /app/examples/truffle-tutorials
RUN chmod 777 run.sh
ENV ENDPOINT_URL=ws://mandala-node:9944
CMD ["/bin/bash", "run.sh", "CI_build_and_test"]
