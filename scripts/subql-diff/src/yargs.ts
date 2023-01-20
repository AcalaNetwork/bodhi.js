import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export const yargsOptions = yargs(hideBin(process.argv))
  .options({
    file1: {
      alias: 'f1',
      demandOption: true,
      describe: 'first csv file to compare',
      type: 'string',
    },
    file2: {
      alias: 'f2',
      demandOption: true,
      describe: 'second csv file to compare',
      type: 'string',
    },
    startBlock: {
      alias: 's',
      demandOption: false,
      describe: 'start block of interest',
      type: 'number',
    },
    endBlock: {
      alias: 'e',
      demandOption: false,
      describe: 'end block of interest',
      type: 'number',
    },
    full: {
      alias: 'f',
      demandOption: false,
      default: false,
      describe: 'show full result',
      type: 'boolean',
    },
  })
  .help()
  .argv;
