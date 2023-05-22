# New Eth RPC Benchmark
first start a local mandala with normal sealing
```
docker run -it --rm -p 9944:9944 -p 9933:9933 ghcr.io/acalanetwork/mandala-node:sha-a32c40b --dev --ws-external --rpc-port=9933 --rpc-external --rpc-cors=all --rpc-methods=unsafe -levm=debug --pruning=archive
```

then start an old rpc adapter
```
npx @acala-network/eth-rpc-adapter@2.5.22 -p 8546
```

as well as a new one
```
npx @acala-network/eth-rpc-adapter@2.6.1
```

then many transactions to the node and benchmark the RPC performance
```
yarn build
yarn start
```

## example result
```
address count: 20
⛏️  deploying token contract
✅ token deployed at block 5

⛏️  sending 1 txs at block 5
✅ mined 1 txs at block 6
🕑 [  getBlock  ] old: 97ms | new: 47ms => 2.06X faster 🚀🚀
🕑 [ getReceipt ] old: 27ms | new: 3ms => 9.00X faster 🚀🚀

⛏️  sending 5 txs at block 6
✅ mined 5 txs at block 7
🕑 [  getBlock  ] old: 242ms | new: 39ms => 6.21X faster 🚀🚀
🕑 [ getReceipt ] old: 29ms | new: 2ms => 14.50X faster 🚀🚀

⛏️  sending 10 txs at block 7
✅ mined 10 txs at block 8
🕑 [  getBlock  ] old: 398ms | new: 36ms => 11.06X faster 🚀🚀
🕑 [ getReceipt ] old: 31ms | new: 2ms => 15.50X faster 🚀🚀

⛏️  sending 30 txs at block 8
✅ mined 30 txs at block 9
🕑 [  getBlock  ] old: 1931ms | new: 65ms => 29.71X faster 🚀🚀
🕑 [ getReceipt ] old: 57ms | new: 3ms => 19.00X faster 🚀🚀

⛏️  sending 50 txs at block 9
✅ mined 50 txs at block 10
🕑 [  getBlock  ] old: 4544ms | new: 44ms => 103.27X faster 🚀🚀
🕑 [ getReceipt ] old: 82ms | new: 2ms => 41.00X faster 🚀🚀

⛏️  sending 80 txs at block 10
✅ mined 80 txs at block 11
🕑 [  getBlock  ] old: 10919ms | new: 120ms => 90.99X faster 🚀🚀
🕑 [ getReceipt ] old: 132ms | new: 3ms => 44.00X faster 🚀🚀

⛏️  sending 100 txs at block 12
✅ mined 100 txs at block 13
🕑 [  getBlock  ] old: 16996ms | new: 88ms => 193.14X faster 🚀🚀
🕑 [ getReceipt ] old: 334ms | new: 3ms => 111.33X faster 🚀🚀

⛏️  sending 200 txs at block 14
✅ mined 200 txs at block 15
🕑 [  getBlock  ] old: 68760ms | new: 112ms => 613.93X faster 🚀🚀
🕑 [ getReceipt ] old: 269ms | new: 3ms => 89.67X faster 🚀🚀

⛏️  sending 300 txs at block 20
✅ mined 300 txs at block 22
🕑 [  getBlock  ] old: 167023ms | new: 160ms => 1043.89X faster 🚀🚀
🕑 [ getReceipt ] old: 860ms | new: 3ms => 286.67X faster 🚀🚀
```
