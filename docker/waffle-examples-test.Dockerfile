# =============== waffle-examples =============== #
FROM node:16-alpine as waffle-examples
COPY --from=bodhi-base /app /app
RUN apk add bash
RUN npm install -g @microsoft/rush@5.55.0

WORKDIR /app
COPY examples/waffle ./examples/waffle

WORKDIR /app/examples/waffle
RUN chmod 777 run.sh
ENV ENDPOINT_URL=ws://mandala-subway:9955
CMD ["/bin/bash", "run.sh", "build_and_test"]
