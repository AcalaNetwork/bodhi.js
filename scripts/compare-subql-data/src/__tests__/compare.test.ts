import path from 'path';
import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { readCSV, compareSubqlData } from '../utils';

describe('compareSubqlData', () => {
  const data = readCSV(path.join(__dirname, '../data/karura-dev.csv'));

  it('when data are the same', () => {
    expect(compareSubqlData(data, data)).to.deep.equal({
      '+': [],
      '-': [],
      '!=': []
    });
  });
});
