import { Extrinsic } from "@polkadot/types/interfaces";

export const sleep = (interval = 1000): Promise<null> => new Promise(resolve => setTimeout(() => resolve(null), interval));

export const isEVMExtrinsic = (e: Extrinsic): boolean => (
  e.method.section.toUpperCase() === "EVM"
);
