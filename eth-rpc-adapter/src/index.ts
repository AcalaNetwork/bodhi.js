import 'dd-trace/init';
import { start } from './server';

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
