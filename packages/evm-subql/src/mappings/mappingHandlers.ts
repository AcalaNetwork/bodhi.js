import '@subql/types/dist/global';
import { SubstrateBlock } from '@subql/types';
import { parseReceiptsFromBlockData } from '@acala-network/eth-providers';

export const handleBlock = async (substrateBlock: SubstrateBlock): Promise<void> => {
  if (!unsafeApi) {
    logger.error('Unsafe API is not available');
  }

  const receipts = await parseReceiptsFromBlockData(
    unsafeApi!,
    substrateBlock,
    substrateBlock.events,
  );

  const blockNumber = substrateBlock.block.header.number.toBigInt();
  const timestamp = substrateBlock.timestamp;
  const receiptEntities: any[] = [];
  const logEntities: any[] = [];

  receipts.forEach((receipt, idx) => {
    const receiptId = `${receipt.blockNumber.toString()}-${idx}`;
    const transactionIndex = BigInt(receipt.transactionIndex);

    receiptEntities.push({
      ...receipt,
      id: receiptId,
      gasUsed: receipt.gasUsed.toBigInt(),
      cumulativeGasUsed: receipt.cumulativeGasUsed.toBigInt(),
      effectiveGasPrice: receipt.effectiveGasPrice.toBigInt(),
      type: BigInt(receipt.type),
      status: BigInt(receipt.status!),
      transactionIndex,
      blockNumber,
      timestamp,
    });

    receipt.logs.forEach(log => logEntities.push({
      ...log,
      id: `${receiptId}-${log.logIndex}`,
      receiptId,
      transactionIndex,
      blockNumber,
      timestamp,
      logIndex: BigInt(log.logIndex),
      removed: false,   // this field was removed by formatter.receipt...
    }));
  });

  await Promise.all([
    store.bulkCreate('TransactionReceipt', receiptEntities),
    store.bulkCreate('Log', logEntities),
  ]);
};
