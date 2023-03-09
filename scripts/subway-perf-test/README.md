## eth-rpc-provider-playground
some playground code to test around with eth rpc provider

```
docker run \
  -e ENDPOINTS=ws://localhost:9944 \
  -e PORT=9955 \
  -p 9955:9955 \
  acala/subway:sha-7c1610c
```

```
yarn start -l -e ws://localhost:9955
```****