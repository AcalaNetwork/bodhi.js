FROM node:16-buster as builder
LABEL maintainer="hello@acala.network"
ENV NODE_ENV=production

WORKDIR /usr/src/app

# RUN apk add git python3 make gcc g++ musl-dev

# # required by some legacy deps
# RUN ln -s /usr/bin/python3 /usr/bin/python && \
#     ln -s /usr/bin/pip3 /usr/bin/pip

# install rush. should match version in rush.json
RUN npm install -g @microsoft/rush@5.55.0

COPY . .
# RUN rush update
# RUN rush build -t @acala-network/eth-rpc-adaptor
# RUN cd eth-rpc-adapter
# RUN yarn
# RUN yarn build

# =============

# FROM node:14-alpine as builder

# COPY --from=builder

# EXPOSE 8545

# USER node

ENTRYPOINT sh

# CMD ["yarn", "start"]