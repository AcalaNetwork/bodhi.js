import { BlockTag, Filter, Log } from '@ethersproject/abstract-provider';
import { request, gql } from 'graphql-request';
import { TransactionReceipt, Query, LogFilter } from './gqlTypes';
export * from './gqlTypes';

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

export const getAllTxReceipts = async (): Promise<TransactionReceipt[]> => {
  const res = await queryGraphql(`
    query {
      transactionReceipts {
        ${TX_RECEIPT_NODES}
      }
    }
  `);

  return res.transactionReceipts!.nodes as TransactionReceipt[];
};

export const getTxReceiptByHash = async (hash: string): Promise<TransactionReceipt | null> => {
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

export const getAllLogs = async (): Promise<Log[]> => {
  const res = await queryGraphql(`
    query {
      logs {
        ${LOGS_NODES}
      }
    }
  `);

  return res.logs!.nodes as Log[];
};

export const getFilteredLogs = async (filter: Filter): Promise<Log[]> => {
  const queryFilter = getLogsQueryFilter(filter);
  console.log('!!!!!!!!!!!!!!', queryFilter);

  const res = await queryGraphql(`
    query {
      logs${queryFilter} {
        ${LOGS_NODES}
      }
    }
  `);

  return res.logs!.nodes as Log[];
};
