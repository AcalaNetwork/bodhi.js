import fs from 'fs';
import { JsonRpcProvider } from '@ethersproject/providers';
import { MOONBEAM_RPC } from '../utils';
import { Account } from './utils';
import { csvWriter } from './writer';
import { maliciousAddresses } from './consts';

const ACALA_START_BLOCK = 1638215;
const ACALA_END_BLOCK = 1639493;
const MOONBEAM_START_BLOCK = ACALA_START_BLOCK + 8500;
const MOONBEAM_END_BLOCK = ACALA_END_BLOCK + 8500;

const provider = new JsonRpcProvider(MOONBEAM_RPC);

const summary = {};

const main = async () => {
  for (const addr of maliciousAddresses) {
    console.log(`checking ${addr} ...`);

    const account = new Account(addr, provider);
    await account.fetchAllTx(MOONBEAM_START_BLOCK);

    const data = account.toJson();
    const sum = account.getSummary();

    // console.log(JSON.stringify(sum, null, 2));

    summary[account.address] = sum;

    console.log(`writing ${data.length} data ...`);
    await csvWriter.writeRecords(data);
    await csvWriter.writeRecords({});
    await csvWriter.writeRecords({});
    await csvWriter.writeRecords({});
    console.log('OK ✔️');
    console.log('');

    fs.writeFileSync('summary.json', JSON.stringify(summary, null, 2));
  }
};

main().then(
  () => process.exit(0),
  (e) => {
    console.log(e);
    process.exit(1);
  }
);
