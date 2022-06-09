import { Filter, Log, BlockTag } from '@ethersproject/abstract-provider';
import { Log as LogGQL } from './gqlTypes';

/* ---------------------------------------------------------- */
/* --------------- log util for eth_subscribe --------------- */
/* ---------------------------------------------------------- */

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

/* --------------------------------------------------- */
/* --------------- log utils for Subql --------------- */
/* --------------------------------------------------- */

const isDefined = (x: any): boolean => x !== undefined && x !== null;
const isAnyDefined = (arr: any[]): boolean => arr.some((a) => isDefined(a));

const _getBlockNumberFilter = (fromBlock: BlockTag | undefined, toBlock: BlockTag | undefined): string => {
  const fromBlockFilter = isDefined(fromBlock) ? `greaterThanOrEqualTo: "${fromBlock}"` : '';
  const toBlockFilter = isDefined(toBlock) ? `lessThanOrEqualTo: "${toBlock}"` : '';

  return !!fromBlockFilter || !!toBlockFilter
    ? `blockNumber: {
    ${fromBlockFilter}
    ${toBlockFilter}
  }`
    : '';
};

const _getAddressFilter = (address: string | undefined): string =>
  address ? `address: { inInsensitive: ${JSON.stringify(Array.isArray(address) ? address : [address])}}` : '';

const _getTopicsFilter = (topics: Array<string | Array<string> | null> | undefined): string => {
  // NOTE: if needed in the future, we can implement actual nested topic filter.
  // Now we just flat all topics
  const allTopics = (topics?.length! > 0 ? topics!.flat() : []).filter((t) => t) as string[];

  return `
    topics: {
      contains: ${JSON.stringify(allTopics)}
    }
  `;
};

export const getLogsQueryFilter = (filter: Filter): string => {
  const { fromBlock, toBlock, address, topics } = filter;
  if (!isAnyDefined([fromBlock, toBlock, address, topics])) {
    return '';
  }

  const addressFilter = _getAddressFilter(address);
  const blockNumberFilter = _getBlockNumberFilter(fromBlock, toBlock);
  const topicsFilter = _getTopicsFilter(topics);

  const queryFilter = `(filter: {
    ${addressFilter}
    ${blockNumberFilter}
    ${topicsFilter}
  })`;

  return queryFilter;
};

// adapt logs from graphql to provider compatible types
export const adaptLogs = (logs: LogGQL[]): Log[] =>
  logs.map((log) => ({
    ...log,
    data: log.data || ''
  }));

export const LOGS_NODES = `
  nodes {
    blockNumber,
    blockHash,
    transactionIndex,
    removed,
    address,
    data,
    topics,
    transactionHash,
    logIndex,
  }
`;

export const TX_RECEIPT_NODES = `
  nodes {
    id
    to
    from
    contractAddress
    transactionIndex
    gasUsed
    logsBloom
    blockHash
    transactionHash
    blockNumber
    effectiveGasPrice
    cumulativeGasUsed
    type
    status
    logs {
      ${LOGS_NODES}
    }
  }
`;
