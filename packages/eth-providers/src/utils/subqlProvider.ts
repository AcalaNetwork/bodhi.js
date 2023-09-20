import { LOGS_NODES, SanitizedLogFilter, TX_RECEIPT_NODES, adaptLogs, buildLogsGqlFilter } from './logs';
import { Log } from '@ethersproject/abstract-provider';
import { Log as LogGQL, Query, TransactionReceipt as TxReceiptGQL, _Metadata } from './gqlTypes';
import { gql, request } from 'graphql-request';
import { logger } from './logger';

export class SubqlProvider {
  readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  checkGraphql = async (): Promise<string> => {
    let metaData;
    try {
      metaData = await this.getIndexerMetadata();
    } catch (e) {
      logger.throwError(`Check Graphql failed, you might be using an invalid subquery url! Error: ${e}`);
    }

    return metaData?.genesisHash as string;
  };

  getLastProcessedHeight = async (): Promise<number> => {
    const metaData = await this.getIndexerMetadata();
    return metaData?.lastProcessedHeight ?? 0;
  };

  queryGraphql = (query: string): Promise<Query> =>
    request(
      this.url,
      gql`
        ${query}
      `
    );

  getAllTxReceipts = async (): Promise<TxReceiptGQL[]> => {
    const res = await this.queryGraphql(`
      query {
        transactionReceipts {
          ${TX_RECEIPT_NODES}
        }
      }
    `);

    return res.transactionReceipts!.nodes as TxReceiptGQL[];
  };

  getTxReceiptByHash = async (hash: string): Promise<TxReceiptGQL | null> => {
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

  getAllReceiptsAtBlock = async (hash: string): Promise<TxReceiptGQL[]> => {
    const res = await this.queryGraphql(`
      query {
        transactionReceipts(filter: {
          blockHash:{
            equalTo: "${hash}"
          }
        }) {
          ${TX_RECEIPT_NODES}
        }
      }
    `);

    return res.transactionReceipts!.nodes as TxReceiptGQL[];
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

  getFilteredLogs = async (filter: SanitizedLogFilter): Promise<Log[]> => {
    const queryFilter = buildLogsGqlFilter(filter);

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
