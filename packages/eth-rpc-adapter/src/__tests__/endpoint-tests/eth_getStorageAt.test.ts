import { describe, expect, it } from 'vitest';

import { deployErc20, eth_getStorageAt, testSetup } from '../utils';
import { hexZeroPad, parseEther } from 'ethers/lib/utils';

const { wallet } = testSetup;

describe('eth_getStorageAt', () => {
  it('get correct storage', async () => {
    const token = await deployErc20(wallet);

    const _getStorageAtForToken = async (slot: string) => {
      return (await eth_getStorageAt([token.address, slot, 'latest'])).data.result;
    };

    const totalSupplyStorage = hexZeroPad(parseEther('1000000000').toHexString(), 32);

    expect((await _getStorageAtForToken('0x0000000000000000000000000000000000000000000000000000000000000000'))).to.equal(totalSupplyStorage);
    expect((await _getStorageAtForToken('0x0'))).to.equal(totalSupplyStorage);

    expect((await _getStorageAtForToken('0x1'))).to.equal(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );

    expect((await _getStorageAtForToken('0x2'))).to.equal(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );

    expect((await _getStorageAtForToken('0x3'))).to.equal(
      '0x54657374546f6b656e0000000000000000000000000000000000000000000012'
    );
  });
});
