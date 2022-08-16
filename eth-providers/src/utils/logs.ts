import { Filter, Log, BlockTag } from '@ethersproject/abstract-provider';
import { Log as LogGQL } from './gqlTypes';

export type TopicsFilter = (string | string[] | null)[] | undefined;
export type AddressFilter = string | string[] | undefined;
export interface SubscriptionLogFilter {
  address?: string | string[];
  topics?: TopicsFilter;
}

// https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_newfilter
export const filterLogByTopics = (log: Log, topics: TopicsFilter): boolean => {
  if (!topics || topics.length === 0) return true;

  for (const [i, targetTopic] of topics.entries()) {
    if (i > 3) break; // max 4 topics

    const curTopic = log.topics[i]?.toLowerCase();
    if (typeof targetTopic === 'string') {
      if (curTopic !== targetTopic.toLowerCase()) return false;
    } else if (Array.isArray(targetTopic) && targetTopic.length > 0) {
      if (!targetTopic.map((x) => x.toLowerCase()).includes(curTopic)) return false;
    }
  }

  return true;
};

export const filterLogByAddress = (log: Log, targetAddr: AddressFilter): boolean => {
  if (!targetAddr || (Array.isArray(targetAddr) && targetAddr.length === 0)) return true;

  const logAddr = log.address.toLowerCase();
  if (typeof targetAddr === 'string') {
    if (logAddr !== targetAddr.toLowerCase()) return false;
  } else if (Array.isArray(targetAddr)) {
    if (!targetAddr.map((x) => x.toLowerCase()).includes(logAddr)) return false;
  }

  return true;
};

// it's for eth_subscribe, and a little bit different than general log filter
export const filterLog = (log: Log, filter: SubscriptionLogFilter): boolean =>
  filterLogByAddress(log, filter.address) && filterLogByTopics(log, filter.topics);

/* --------------------------------------------------- */
/* --------------- log utils for Subql --------------- */
/* --------------------------------------------------- */

const isEffectiveFilter = (x: any): boolean => x !== undefined && x !== null && !(Array.isArray(x) && x.length === 0);
const isAnyFilterEffective = (arr: any[]): boolean => arr.some((a) => isEffectiveFilter(a));

const _getBlockNumberFilter = (fromBlock: BlockTag | undefined, toBlock: BlockTag | undefined): string => {
  const fromBlockFilter = isEffectiveFilter(fromBlock) ? `greaterThanOrEqualTo: "${fromBlock}"` : '';
  const toBlockFilter = isEffectiveFilter(toBlock) ? `lessThanOrEqualTo: "${toBlock}"` : '';

  return !!fromBlockFilter || !!toBlockFilter
    ? `blockNumber: {
    ${fromBlockFilter}
    ${toBlockFilter}
  }`
    : '';
};

const _getAddressFilter = (address: string | undefined): string =>
  address ? `address: { inInsensitive: ${JSON.stringify(Array.isArray(address) ? address : [address])}}` : '';

export const getLogsQueryFilter = (filter: Filter): string => {
  const { fromBlock, toBlock, address } = filter;
  if (!isAnyFilterEffective([fromBlock, toBlock, address])) {
    return '';
  }

  const addressFilter = _getAddressFilter(address);
  const blockNumberFilter = _getBlockNumberFilter(fromBlock, toBlock);

  // subql don't filter topics since it's impossible to implement standard bloom filter here
  // can still add some first round loose topics filter to decrease result size if needed
  const queryFilter = `(filter: {
    ${addressFilter}
    ${blockNumberFilter}
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
    cumulativeGasUsed
    effectiveGasPrice,
    type
    status
    logs {
      ${LOGS_NODES}
    }
  }
`;
