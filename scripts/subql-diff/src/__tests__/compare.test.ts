import path from 'path';
import { describe, it } from 'mocha';
import { expect } from 'chai';
import { readCSV, compareSubqlData, deepClone } from '../utils';
import { Diff, LogOrReceipt } from '../types';

const testFiles = [
  'test-receipts',
  'test-logs',
];

testFiles.forEach(f => {
  describe(`compareSubqlData - ${f}`, () => {
    const data = readCSV(path.join(__dirname, `../../data/${f}.csv`));
    it('when data are the same', () => {
      expect(compareSubqlData(data, data)).to.deep.equal({
        '+': [],
        '-': [],
        '!=': [],
      });
    });

    it('when there are extra data or missing data', () => {
      const removeIdxs = [0, 12, 178];
      const expectedExtras = removeIdxs.map((i) => data[i]);
      const newData = data.filter((_, i) => !removeIdxs.includes(i));

      expect(newData.length).to.equal(data.length - removeIdxs.length);
      expect(compareSubqlData(data, newData)).to.deep.equal({
        '+': expectedExtras,
        '-': [],
        '!=': [],
      });

      expect(compareSubqlData(newData, data)).to.deep.equal({
        '+': [],
        '-': expectedExtras,
        '!=': [],
      });
    });

    it('when there are diff data', () => {
      const modifiedIdxs = [2, 56, 57];
      const newBlockNum = '12345';
      const newData = deepClone(data);
      const expectedDiff = [] as Diff<LogOrReceipt>[];
      modifiedIdxs.forEach((i) => {
        newData[i].block_number = newBlockNum;
        expectedDiff.push({
          id: data[i].id,
          block_number: `${data[i].block_number}, ${newBlockNum}`,
        });
      });

      expect(newData.length).to.equal(data.length);
      expect(compareSubqlData(data, newData)).to.deep.equal({
        '+': [],
        '-': [],
        '!=': expectedDiff,
      });
    });

    it('when there are all extra/missing/diff data', () => {
      // modify
      const modifiedIdxs = [0, 88, 199];
      const newBlockNum = '58745';
      let newData = deepClone(data);
      const expectedDiff = [] as Diff<LogOrReceipt>[];
      modifiedIdxs.forEach((i) => {
        newData[i].block_number = newBlockNum;
        expectedDiff.push({
          id: data[i].id,
          block_number: `${newBlockNum}, ${data[i].block_number}`,
        });
      });

      // missing - remove from newData
      const removeIdxs = [22, 111, 179];
      const expectedMissing = removeIdxs.map((i) => data[i]);
      newData = newData.filter((_, i) => !removeIdxs.includes(i));

      // extra - remove from original data
      const extraIdxs = [128, 233];
      const expectedExtras = extraIdxs.map((i) => newData[i]);
      const _data = data.filter((tx) => !expectedExtras.map(({ id }) => id).includes(tx.id));

      // both sides add back removed data, length should be equal
      expect(newData.length + removeIdxs.length).to.equal(_data.length + extraIdxs.length);
      expect(compareSubqlData(newData, _data)).to.deep.equal({
        '+': expectedExtras,
        '-': expectedMissing,
        '!=': expectedDiff,
      });
    });
  });
});
