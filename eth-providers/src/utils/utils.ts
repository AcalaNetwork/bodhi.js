export const toHex = (x: number): string => `0x${x.toString(16)}`;

export const sleep = (interval = 1000): Promise<void> => new Promise(resolve => setTimeout(resolve, interval));