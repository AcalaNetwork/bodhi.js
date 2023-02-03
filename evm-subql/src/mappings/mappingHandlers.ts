import '@polkadot/api-augment';
import { parseReceiptsFromBlockData } from '@acala-network/eth-providers/lib/utils';
import { SubstrateBlock } from '@subql/types';
import { Log, TransactionReceipt } from '../types';

export const handleBlock = async (substrateBlock: SubstrateBlock): Promise<void> => {
  const receipts = await parseReceiptsFromBlockData(
    global.unsafeApi,
    substrateBlock,
    substrateBlock.events,
  );

  for (const [idx, receipt] of receipts.entries()) {
    const receiptId = `${receipt.blockNumber.toString()}-${idx}`;
    const transactionIndex = BigInt(receipt.transactionIndex);
    const blockNumber = BigInt(receipt.blockNumber);
  
    await TransactionReceipt.create({
      ...receipt,
      id: receiptId,
      gasUsed: receipt.gasUsed.toBigInt(),
      cumulativeGasUsed: receipt.cumulativeGasUsed.toBigInt(),
      effectiveGasPrice: receipt.effectiveGasPrice.toBigInt(),
      type: BigInt(receipt.type),
      status: BigInt(receipt.status),
      transactionIndex,
      blockNumber,
    }).save();

    for (const log of receipt.logs) {
      await Log.create({
        ...log,
        id: `${receiptId}-${log.logIndex}`,
        receiptId,
        transactionIndex,
        blockNumber,
        logIndex: BigInt(log.logIndex),
        removed: false,   // this field was removed by formatter.receipt...
      }).save();
    }
  }
};
