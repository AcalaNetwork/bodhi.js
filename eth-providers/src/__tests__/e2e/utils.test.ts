import { hexValue } from '@ethersproject/bytes';
import { expect } from 'chai';
import { hexlifyRpcResult } from '../../utils';

describe('utils', () => {
  it('connect chain', async () => {
    const a = hexValue(1616274408000);
    const b = hexValue(0);

    expect(a).to.equal('0x17851764240');
    expect(b).to.equal('0x0');
  });

  it('getLogs hexlify', () => {
    const data = [
      {
        blockNumber: 422586,
        blockHash: '0xa1a07ccf1bb31e8da1e1d62cb5aecd3012f8596826ce750f976d7f1fdfb542a5',
        transactionIndex: 0,
        removed: false,
        address: '0xe6F4a83eE9f946B86a2ef008dCD872f4a942DB24',
        data: '0x426ab38338be5d42c2cafd1075db80e71965e43f87c11536d8cf0a0dae40d54300000000000000000000000029b563951ed0eb9ae5c49692266e1fbc81445cfe00000000000000000000000029b563951ed0eb9ae5c49692266e1fbc81445cfe00000000000000000000000064ff10dced55d2efeb47f132dd09d37616bfbd18000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000002532c0a3b36bf2a0bbe9a9e96ceeb0ef55ed415dfaafae68823b57bcbffab4e0cca',
        topics: ['0x79fa08de5149d912dce8e5e8da7a7c17ccdf23dd5d3bfe196802e6eb86347c7c'],
        transactionHash: '0x20220cf9d4bf9a666fc7507b47ae85339a81a899c958a83af644453243c86603',
        logIndex: 1
      }
    ];

    const result = hexlifyRpcResult(data);

    expect(result).deep.eq([
      {
        blockNumber: '0x672ba',
        blockHash: '0xa1a07ccf1bb31e8da1e1d62cb5aecd3012f8596826ce750f976d7f1fdfb542a5',
        transactionIndex: '0x0',
        removed: false,
        address: '0xe6F4a83eE9f946B86a2ef008dCD872f4a942DB24',
        data: '0x426ab38338be5d42c2cafd1075db80e71965e43f87c11536d8cf0a0dae40d54300000000000000000000000029b563951ed0eb9ae5c49692266e1fbc81445cfe00000000000000000000000029b563951ed0eb9ae5c49692266e1fbc81445cfe00000000000000000000000064ff10dced55d2efeb47f132dd09d37616bfbd18000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000002532c0a3b36bf2a0bbe9a9e96ceeb0ef55ed415dfaafae68823b57bcbffab4e0cca',
        topics: ['0x79fa08de5149d912dce8e5e8da7a7c17ccdf23dd5d3bfe196802e6eb86347c7c'],
        transactionHash: '0x20220cf9d4bf9a666fc7507b47ae85339a81a899c958a83af644453243c86603',
        logIndex: '0x1'
      }
    ]);
  });
});
