import { getTxReceiptByHash, getAllTxReceipts } from '../utils';
import { TransactionReceipt } from '../utils/gqlTypes';

describe('getTxReceiptByHash', () => {
  it('returns correct result when hash exist', async () => {
    const allTxReceipts = await getAllTxReceipts();

    // test first one
    let txR = allTxReceipts[0];
    let res = await getTxReceiptByHash(txR.transactionHash);
    expect(res).toEqual(txR);

    // test last one
    txR = allTxReceipts[allTxReceipts.length - 1];
    res = await getTxReceiptByHash(txR.transactionHash);
    expect(res).toEqual(txR);

    // test middle one
    txR = allTxReceipts[Math.floor(allTxReceipts.length / 2)];
    res = await getTxReceiptByHash(txR.transactionHash);
    expect(res).toEqual(txR);
  });

  it('returns null when hash not found', async () => {
    const res = await getTxReceiptByHash('0x000');

    expect(res).toEqual(null);
  });
});
