import { hexValue } from '@ethersproject/bytes';
import { expect } from 'chai';

describe('utils', () => {
  it('connect chain', async () => {
    const a = hexValue(1616274408000);
    const b = hexValue(0);

    expect(a).to.equal('0x17851764240');
    expect(b).to.equal('0x0');
  });
});
