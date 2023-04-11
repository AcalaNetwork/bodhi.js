import { describe, expect, it } from 'vitest';
import { parseBooleanOption } from '../utils';

describe('parseBooleanOption', () => {
  it('parse correctly', () => {
    expect(parseBooleanOption('xxx', true, undefined)).to.equal(true);
    expect(parseBooleanOption('xxx', false, undefined)).to.equal(false);

    expect(parseBooleanOption('xxx', true, '0')).to.equal(false);
    expect(parseBooleanOption('xxx', true, '1')).to.equal(true);

    expect(parseBooleanOption('xxx', false, '0')).to.equal(false);
    expect(parseBooleanOption('xxx', false, '1')).to.equal(true);

    expect(parseBooleanOption('xxx', true, 'false')).to.equal(false);
    expect(parseBooleanOption('xxx', true, 'true')).to.equal(true);

    expect(parseBooleanOption('xxx', false, 'false')).to.equal(false);
    expect(parseBooleanOption('xxx', false, 'true')).to.equal(true);

    expect(() => parseBooleanOption('xxx', false, 'hahaha')).to.throw(
      `boolean env xxx should be any of { true, false, 1, 0 }, got hahaha`
    );
  });
});
