export const sleep = (interval = 1000): Promise<null> => new Promise(resolve => setTimeout(() => resolve(null), interval));
