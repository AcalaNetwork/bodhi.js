import { describe, expect, it } from 'vitest';

import {
  eth_accounts,
  eth_blockNumber,
  eth_getEthGas,
  net_listening,
} from '../utils';

describe('eth_accounts', () => {
  it('returns empty array', async () => {
    const res = await eth_accounts([]);
    expect(res.data.result).to.deep.equal([]);
  });
});

describe('net_listening', () => {
  it('returns true', async () => {
    const res = (await net_listening([])).data.result;
    expect(res).to.deep.equal(true);
  });
});

describe('eth_getEthGas', () => {
  it('get correct default contract deployment eth gas params', async () => {
    const gasLimit = 21000000;
    const storageLimit = 64100;
    const validUntil = 1000000;

    // correspond to validUntil = 1000000
    const defaultResults1 = await Promise.all([
      eth_getEthGas([{ gasLimit, storageLimit, validUntil }]),
      eth_getEthGas([{ gasLimit, validUntil }]),
      eth_getEthGas([{ storageLimit, validUntil }]),
      eth_getEthGas([{ validUntil }]),
    ]);

    for (const res of defaultResults1) {
      const gas = res.data.result;

      expect(parseInt(gas.gasLimit, 16)).to.equal(117192000);
      expect(parseInt(gas.gasPrice)).to.equal(202184524778);
    }

    // correspond to validUntil = curBlock + 150
    const curBlock = parseInt((await eth_blockNumber([])).data.result, 16);
    const expectedGasPrice = parseInt(
      (
        await eth_getEthGas([
          {
            validUntil: curBlock + 150,
          },
        ])
      ).data.result.gasPrice,
      16
    );

    const defaultResults2 = await Promise.all([
      eth_getEthGas([{ gasLimit }]),
      eth_getEthGas([{ storageLimit }]),
      eth_getEthGas([{ gasLimit, storageLimit }]),
      eth_getEthGas([{}]),
      eth_getEthGas([]),
    ]);

    for (const res of defaultResults2) {
      const gas = res.data.result;

      expect(parseInt(gas.gasLimit, 16)).to.equal(117192000);
      expect(parseInt(gas.gasPrice)).to.equal(expectedGasPrice);
    }
  });

  it('get correct custom eth gas params', async () => {
    const gasLimit = 12345678;
    const storageLimit = 30000;
    const validUntil = 876543;

    const gas = (await eth_getEthGas([{ gasLimit, storageLimit, validUntil }])).data.result;

    expect(parseInt(gas.gasLimit, 16)).to.equal(57369678);
    expect(parseInt(gas.gasPrice)).to.equal(201914843605);
  });

  it('throws error when params are not valid', async () => {
    const res = await eth_getEthGas([{ anyParam: 12345 }]);

    expect(res.data.error.code).to.equal(-32602);
    expect(res.data.error.message).to.contain('parameter can only be \'storageLimit\' | \'gasLimit\' | \'validUntil\'');
  });
});
