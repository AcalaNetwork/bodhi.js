import { BlockTag, Filter, Log } from '@ethersproject/abstract-provider';
import { request, gql } from 'graphql-request';
import { Query, TransactionReceipt as TXReceiptGQL, Log as LogGQL } from './gqlTypes';

const URL = 'http://localhost:3001';

const queryGraphql = (query: string): Promise<Query> =>
  request(
    URL,
    gql`
      ${query}
    `
  );

const LOGS_NODES = `
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

const TX_RECEIPT_NODES = `
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
    type
    status
    logs {
      ${LOGS_NODES}
    }
  }
`;

export const getAllTxReceipts = async (): Promise<TXReceiptGQL[]> => {
  const res = await queryGraphql(`
    query {
      transactionReceipts {
        ${TX_RECEIPT_NODES}
      }
    }
  `);

  return res.transactionReceipts!.nodes as TXReceiptGQL[];
};

export const getTxReceiptByHash = async (hash: string): Promise<TXReceiptGQL | null> => {
  const res = await queryGraphql(`
    query {
      transactionReceipts(filter: {
        transactionHash:{
          equalTo: "${hash}"
        }
      }) {
        ${TX_RECEIPT_NODES}
      }
    }
  `);

  return res.transactionReceipts!.nodes[0] || null;
};

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
  address ? `address: { in: ${JSON.stringify(Array.isArray(address) ? address : [address])}}` : '';

const _getTopicsFilter = (topics: Array<string | Array<string> | null> | undefined): string => {
  // NOTE: if needed in the future, we can implement actual nested topic filter.
  // Now we just flat all topics
  const allTopics = topics?.length! > 0 ? topics!.flat() : [];
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
const _adaptLogs = (logs: LogGQL[]): Log[] =>
  logs.map((log) => ({
    ...log,
    data: log.data || ''
  }));

export const getAllLogs = async (): Promise<Log[]> => {
  const res = await queryGraphql(`
    query {
      logs {
        ${LOGS_NODES}
      }
    }
  `);

  return _adaptLogs(res.logs!.nodes as LogGQL[]);
};

export const getFilteredLogs = async (filter: Filter): Promise<Log[]> => {
  const queryFilter = getLogsQueryFilter(filter);

  const res = await queryGraphql(`
    query {
      logs${queryFilter} {
        ${LOGS_NODES}
      }
    }
  `);

  return _adaptLogs(res.logs!.nodes as LogGQL[]);
};
