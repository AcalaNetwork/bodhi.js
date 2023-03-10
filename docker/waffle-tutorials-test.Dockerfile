# =============== waffle-tutorials =============== #
FROM node:16-alpine as waffle-tutorials
COPY --from=bodhi-base /app /app
RUN apk add bash
RUN npm install -g @microsoft/rush@5.55.0

WORKDIR /app
COPY examples/waffle-tutorials ./examples/waffle-tutorials

WORKDIR /app/examples/waffle-tutorials
RUN chmod 777 run.sh
ENV ENDPOINT_URL=ws://mandala-subway:9955
CMD ["/bin/bash", "run.sh", "build_and_test"]
