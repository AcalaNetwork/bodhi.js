import path from 'path';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { readCSV, compareSubqlData } from '../utils';
import { Diff } from '../types';

describe('compareSubqlData', () => {
  const data = readCSV(path.join(__dirname, '../data/test-data.csv'));

  it('when data are the same', () => {
    expect(compareSubqlData(data, data)).to.deep.equal({
      '+': [],
      '-': [],
      '!=': []
    });
  });

  it('when there are extra data or missing data', () => {
    const removeIdxs = [0, 123, 678];
    const expectedExtras = removeIdxs.map((i) => data[i]);
    const newData = data.filter((_, i) => !removeIdxs.includes(i));

    expect(newData.length).to.equal(data.length - removeIdxs.length);
    expect(compareSubqlData(data, newData)).to.deep.equal({
      '+': expectedExtras,
      '-': [],
      '!=': []
    });

    expect(compareSubqlData(newData, data)).to.deep.equal({
      '+': [],
      '-': expectedExtras,
      '!=': []
    });
  });

  it('when there are diff data', () => {
    const modifiedIdxs = [252, 878, 1642];
    const newGasUsed = '12345';
    const newData = data.map((tx) => ({ ...tx })); // fake deep clone
    const expectedDiff = [] as Diff[];
    modifiedIdxs.forEach((i) => {
      newData[i].gas_used = newGasUsed;
      expectedDiff.push({
        id: data[i].id,
        gas_used: `${data[i].gas_used}, ${newGasUsed}`
      });
    });

    expect(newData.length).to.equal(data.length);
    expect(compareSubqlData(data, newData)).to.deep.equal({
      '+': [],
      '-': [],
      '!=': expectedDiff
    });
  });

  it('when there are all extra/missing/diff data', () => {
    // modify
    const modifiedIdxs = [0, 88, 199];
    const newGasUsed = '58745';
    let newData = data.map((tx) => ({ ...tx })); // fake deep clone
    const expectedDiff = [] as Diff[];
    modifiedIdxs.forEach((i) => {
      newData[i].gas_used = newGasUsed;
      expectedDiff.push({
        id: data[i].id,
        gas_used: `${newGasUsed}, ${data[i].gas_used}`
      });
    });

    // missing - remove from newData
    const removeIdxs = [22, 111, 679];
    const expectedMissing = removeIdxs.map((i) => data[i]);
    newData = newData.filter((_, i) => !removeIdxs.includes(i));

    // extra - remove from original data
    const extraIdxs = [128, 333];
    const expectedExtras = extraIdxs.map((i) => newData[i]);
    const _data = data.filter((tx) => !expectedExtras.map(({ id }) => id).includes(tx.id));

    // both sides add back removed data, length should be equal
    expect(newData.length + removeIdxs.length).to.equal(_data.length + extraIdxs.length);
    expect(compareSubqlData(newData, _data)).to.deep.equal({
      '+': expectedExtras,
      '-': expectedMissing,
      '!=': expectedDiff
    });
  });
});
