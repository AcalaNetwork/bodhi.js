import { request, gql } from 'graphql-request';
import { TransactionReceipt, Query } from './gqlTypes';
export * from './gqlTypes';

const URL = 'http://localhost:3001';

const queryGraphql = (query: string): Promise<Query> =>
  request(
    URL,
    gql`
      ${query}
    `
  );

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
