import { compareSubqlData, readCSV } from './utils';
import { yargsOptions } from './yargs';

const main = async () => {
  const opts = await yargsOptions;

  const data1 = readCSV(opts.file1);
  const data2 = readCSV(opts.file2);

  const res = compareSubqlData(data1, data2, opts.startBlock, opts.endBlock);

  if (!opts.full) {
    res['+'] = res['+'].map((tx) => tx.id) as any;
    res['-'] = res['-'].map((tx) => tx.id) as any;
    res['!='] = res['!='].map((tx) => tx.id) as any;
  }

  console.log(res);
  console.log({
    'extra records': res['+'].length,
    'missing records': res['-'].length,
    'diff records': res['!='].length
  });
};

main();
