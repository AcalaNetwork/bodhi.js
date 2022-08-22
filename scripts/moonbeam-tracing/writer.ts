const createCsvWriter = require('csv-writer').createObjectCsvWriter;
export const csvWriter = createCsvWriter({
  path: 'moonbeam-trace.csv',
  header: [
    { id: 'blockNumber', title: 'blockNumber' },
    { id: 'hash', title: 'hash' },
    { id: 'from', title: 'from' },
    { id: 'to', title: 'to' },
    { id: 'value', title: 'value' },
    { id: 'important', title: 'important' },
    { id: 'action', title: 'action' },
    // send token
    { id: 'tokenSymbol', title: 'tokenName' },
    { id: 'amount', title: 'amount' },
    { id: 'destination', title: 'destination' },
    // swap
    { id: 'tokenIn', title: 'tokenInName' },
    { id: 'tokenInAmount', title: 'tokenInAmount' },
    { id: 'tokenOut', title: 'tokenOutName' },
    { id: 'tokenOutAmount', title: 'tokenOutAmount' },
    // xcm
    { id: 'xcmToken', title: 'xcmToken' },
    { id: 'xcmAmount', title: 'xcmAmount' },
    // explain
    { id: 'explain', title: 'explain' }
  ]
});
