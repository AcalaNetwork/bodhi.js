import { Filter, Log } from '@ethersproject/abstract-provider';
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

export const getLogsQueryFilter = (filter: Filter): string => {
  const { fromBlock, toBlock, address, topics } = filter;
  if (!fromBlock && !toBlock && !address && !topics) return '';

  const addressFilter =
    address &&
    `address: {
    in: ${JSON.stringify(Array.isArray(address) ? address : [address])}
  }`;

  // #TODO: parse string fromBlock and toBlock in base provider
  const fromBlockFilter = fromBlock ? `greaterThanOrEqualTo: "${fromBlock}"` : '';
  const toBlockFilter = toBlock ? `lessThanOrEqualTo: "${toBlock}"` : '';
  const blockNumberFilter =
    (fromBlock || toBlock) &&
    `blockNumber: {
    ${fromBlockFilter}
    ${toBlockFilter}
  }`;

  const queryFilter = `(filter: {
    ${addressFilter || ''}
    ${blockNumberFilter || ''}
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
