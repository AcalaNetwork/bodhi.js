import { start } from './server';

start().catch((e) => {
  console.log(e);
  process.exit(1);
});
