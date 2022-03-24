import { AnyFunction } from '@polkadot/types/types';

export const sleep = async (time: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, time));

export const runWithRetries = async <F extends AnyFunction>(
  fn: F,
  args: any[] = [],
  maxRetries: number = 2,
  interval: number = 1000,
): Promise<F extends (...args: any[]) => infer R ? R : any> => {
  let res;
  let tries = 0;

  while (res === undefined && tries++ < maxRetries) {
    try {
      res = await fn(...args);
    } catch (e) {
      console.log(`failed attemp # ${tries}/${maxRetries}`);
      if (tries === maxRetries) throw e;
      await sleep(interval);
    }
  }

  return res;
}
