import { Filter, FilterByBlockHash, Log } from '@ethersproject/abstract-provider';
import { request, gql } from 'graphql-request';
import { Query, _Metadata, TransactionReceipt as TXReceiptGQL, Log as LogGQL } from './gqlTypes';
import { getLogsQueryFilter, adaptLogs, LOGS_NODES, TX_RECEIPT_NODES } from './logs';

export class SubqlProvider {
  readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  queryGraphql = (query: string): Promise<Query> =>
    request(
      this.url,
      gql`
        ${query}
      `
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

    return adaptLogs(res.logs!.nodes as LogGQL[]);
  };

  getFilteredLogs = async (filter: Filter & FilterByBlockHash): Promise<Log[]> => {
    const queryFilter = getLogsQueryFilter(filter);

    const res = await this.queryGraphql(`
      query {
        logs${queryFilter} {
          ${LOGS_NODES}
        }
      }
    `);

    return adaptLogs(res.logs!.nodes as LogGQL[]);
  };

  getIndexerMetadata = async (): Promise<_Metadata> => {
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

    return res._metadata!;
  };
}
