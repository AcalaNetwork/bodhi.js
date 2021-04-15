/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  BlockTag,
  Log,
  TransactionReceipt
} from '@ethersproject/abstract-provider';

export abstract class AbstractDataProvider {
  async init(): Promise<void> {}

  /**
   *
   * @param filter The filter to apply to the logs
   * @param resolveBlockNumber The block to retrieve the logs from, defaults
   * to the head
   * @returns A promise that resolves to an array of filtered logs
   */
  abstract getLogs(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    filter: any,
    resolveBlockNumber: (
      blockTag?: BlockTag | Promise<BlockTag>
    ) => Promise<number | undefined>
  ): Promise<Array<Log>>;

  /**
   * Get the transaction receipt for a transaction.
   * @param txHash The transaction hash to get the receipt for
   * @param resolveBlockNumber The block the transaction was resolved
   * @returns A promise resolving to the transaction's receipt
   */
  abstract getTransactionReceipt(
    txHash: string,
    resolveBlockNumber: (
      blockTag?: BlockTag | Promise<BlockTag>
    ) => Promise<number | undefined>
  ): Promise<TransactionReceipt>;
}
