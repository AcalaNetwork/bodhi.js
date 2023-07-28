import { CHAIN_ID_ACALA, CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { getBatchVaaDelay, getGuardianSigCount } from './utils';

const main = async () => {
  const count = Number(process.env.COUNT ?? 20);

  {
    const res = await getGuardianSigCount(CHAIN_ID_KARURA, count);
    console.log(`guaridan signature counts for the recent ${count} karura vaas`);
    console.table(res);
  }

  {
    const res = await getGuardianSigCount(CHAIN_ID_ACALA, count);
    console.log(`guaridan signature counts for the recent ${count} acala vaas`);
    console.table(res);
  }

  {
    const res = await getBatchVaaDelay(CHAIN_ID_KARURA, count);
    console.log(`delayed minutes for the recent ${count} karura vaas`);
    console.log(res);
  }

  {
    const res = await getBatchVaaDelay(CHAIN_ID_ACALA, count);
    console.log(`delayed minutes for the recent ${count} acala vaas`);
    console.log(res);
  }
};

main();
