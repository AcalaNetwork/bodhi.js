import { BlockTag, Filter, Log } from '@ethersproject/abstract-provider';
import { request, gql } from 'graphql-request';
import { Query, TransactionReceipt as TXReceiptGQL, Log as LogGQL } from './gqlTypes';

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
  const allTopics = (topics?.length! > 0 ? topics!.flat() : []).filter((t) => t) as string[];

  return `
    topics: {
      contains: ${JSON.stringify(allTopics)}
    }
  `;
};

const getLogsQueryFilter = (filter: Filter): string => {
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
  
export class SubqlProvider {
  readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  queryGraphql = (query: string): Promise<Query> => request(
    this.url,
    gql`${query}`
  );

  getAllTxReceipts = async (): Promise<TXReceiptGQL[]> => {
    const res = await this.queryGraphql(`
      query {
        transactionReceipts {
          ${TX_RECEIPT_NODES}
        }
      }
    `);

    return res.transactionReceipts!.nodes as TXReceiptGQL[];
  };

  getTxReceiptByHash = async (hash: string): Promise<TXReceiptGQL | null> => {
    const res = await this.queryGraphql(`
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

  getAllLogs = async (): Promise<Log[]> => {
    const res = await this.queryGraphql(`
      query {
        logs {
          ${LOGS_NODES}
        }
      }
    `);

    return _adaptLogs(res.logs!.nodes as LogGQL[]);
  };

  getFilteredLogs = async (filter: Filter): Promise<Log[]> => {
    const queryFilter = getLogsQueryFilter(filter);

    const res = await this.queryGraphql(`
      query {
        logs${queryFilter} {
          ${LOGS_NODES}
        }
      }
    `);

    return _adaptLogs(res.logs!.nodes as LogGQL[]);
  };

  getIndexerMetadata = async (): Promise<any> => {
    const res = await this.queryGraphql(`
      query {
        _metadata {
          lastProcessedHeight
          lastProcessedTimestamp
          targetHeight
          chain
          specName
          genesisHash
          indexerHealthy
          indexerNodeVersion
        }
      }
    `);

    return res._metadata;
  };
};
