import * as fs from 'fs';
import { compareSubqlData, readCSV, toLowerCase } from './utils';
import { yargsOptions } from './yargs';

const main = async () => {
  const opts = await yargsOptions;

  let data1 = readCSV(opts.file1);
  let data2 = readCSV(opts.file2);

  if (!opts.caseSensitive) {
    data1 = data1.map(toLowerCase);
    data2 = data2.map(toLowerCase);
  }

  const res = compareSubqlData(data1, data2, opts.startBlock, opts.endBlock);

  if (!opts.full) {
    res['+'] = res['+'].map((tx) => tx.id) as any;
    res['-'] = res['-'].map((tx) => tx.id) as any;
    res['!='] = res['!='].map((tx) => tx.id) as any;
  }

  const formattedRes = JSON.stringify(res, null, 2);

  if (opts.outFile) {
    fs.writeFileSync(opts.outFile, formattedRes);
  } else {
    console.log(formattedRes);
  }
  console.log({
    'extra records': res['+'].length,
    'missing records': res['-'].length,
    'diff records': res['!='].length,
  });
};

main();
