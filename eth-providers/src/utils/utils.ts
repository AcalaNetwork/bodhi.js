import { Log } from '@ethersproject/abstract-provider';

// TODO: optimize it to better bloom filter
export const filterLog = (log: Log, filter: any): boolean => {
  const { address: targetAddr, topics: targetTopics } = filter;

  if (targetAddr) {
    if (typeof targetAddr === 'string') {
      if (log.address.toLowerCase() !== targetAddr.toLowerCase()) return false;
    } else if (Array.isArray(targetAddr)) {
      if (!targetAddr.map((x: string) => x.toLowerCase()).includes(log.address.toLowerCase())) return false;
    }
  }

  if (targetTopics?.length > 0) {
    if (!log.topics?.length) return false;

    const _targetTopics = targetTopics
      .flat()
      .filter((x: any) => x)
      .map((x: string) => x.toLowerCase());
    for (const t of log.topics) {
      if (_targetTopics.includes(t.toLowerCase())) return true;
    }

    return false;
  }

  return true;
};

export const toHex = (x: number): string => `0x${x.toString(16)}`;

export const sleep = (interval = 1000): Promise<void> => new Promise(resolve => setTimeout(resolve, interval))
