import { hexValue } from '@ethersproject/bytes';

describe('utils', () => {
  it('connect chain', async () => {
    const a = hexValue(1616274408000);
    const b = hexValue(0);

    expect(a).toBe('0x17851764240');
    expect(b).toBe('0x0');
  });
});
