export const toHex = (x: number): string => `0x${x.toString(16)}`;

export const sleep = (interval = 1000): Promise<null> => new Promise(resolve => setTimeout(() => resolve(null), interval));
