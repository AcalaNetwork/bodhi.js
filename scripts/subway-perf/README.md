## Subway Performance Test
Test the performance of eth rpc adapter with subway.

- first start a Acala subway at 9955
```
docker run \
  -p 9955:9955 \
  -e PORT=9955 \
  -e ENDPOINTS=wss://acala-rpc.dwellir.com:443 \
  acala/subway:sha-7c1610c
```

- compare query block performance with/without subway 
```
yarn start
```

should be able to see query block is fully cached
```
localSubway [
  553.9252059459686,
  372.4249150753021,
  8.56840991973877,
  8.893522024154663,
  12.692492961883545
]
acalaDwellir [
  1396.350397825241,
  1051.4803948402405,
  795.791069984436,
  784.277617931366,
  920.0809211730957
]
acala0 [
  1019.4285559654236,
  795.0028829574585,
  599.3508949279785,
  645.3619229793549,
  1142.0367250442505
]
```