import { Extrinsic } from "@polkadot/types/interfaces";
import { AnyFunction } from "@polkadot/types/types";

export const sleep = (interval = 1000): Promise<null> => new Promise(resolve => setTimeout(() => resolve(null), interval));

export const isEVMExtrinsic = (e: Extrinsic): boolean => (
  e.method.section.toUpperCase() === "EVM"
);

export const runWithRetries = async <F extends AnyFunction>(
  fn: F,
  args: any[] = [],
  maxRetries: number = 20,
  interval: number = 300,
): Promise<F extends (...args: any[]) => infer R ? R : any> => {
  let res;
  let tries = 0;

  while (!res && tries++ < maxRetries) {
    try {
      res = await fn(...args);
    } catch (e) {
      if (tries === maxRetries) throw e;
    }

    if (tries > 0 && !res) {
      console.log(`empty result # ${tries}/${maxRetries}`);
      await sleep(interval);
    }
  }

  return res;
}
