import { Log } from '@ethersproject/abstract-provider';

// TODO: optimize it to better bloom filter
export const filterLog = (log: Log, filter: any): boolean => {
  const { address: targetAddr, topics: targetTopics } = filter;

  if (targetAddr) {
    if (typeof targetAddr === 'string') {
      if (log.address !== targetAddr) return false;
    } else if (Array.isArray(targetAddr)) {
      if (!targetAddr.includes(log.address)) return false;
    }
  }

  if (targetTopics?.length > 0) {
    if (!log.topics?.length) return false;

    const _targetTopics = targetTopics.flat();
    for (const t of log.topics) {
      if (!_targetTopics.includes(t)) return false;
    }
  }

  return true;
};

export const toHex = (x: number): string => `0x${x.toString(16)}`;
