import { u8aConcat, u8aToHex } from '@polkadot/util';
import { blake2AsU8a, decodeAddress } from '@polkadot/util-crypto';
import { Provider } from '..';

describe('bodhi', () => {
  it('should export the Provider', () => {
    expect(Provider).toBeDefined();
  });

  it('default evm address', () => {
    const accountid = decodeAddress(
      '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY'
    );

    const encode = u8aConcat('evm:', accountid);

    expect(u8aToHex(blake2AsU8a(encode, 256).slice(0, 20))).toEqual(
      '0xf4ca11ca834c9e2fb49f059ab71fb9c72dad05f9'
    );
  });
});
