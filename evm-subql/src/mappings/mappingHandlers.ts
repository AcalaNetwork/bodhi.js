import {
  getPartialTransactionReceipt,
  PartialTransactionReceipt,
  getTransactionIndexAndHash
} from '@acala-network/eth-providers/lib/utils/transactionReceiptHelper';
import { SubstrateEvent } from '@subql/types';
import { Log, TransactionReceipt } from '../types';

const NOT_EXIST_TRANSACTION_INDEX = 0xffff;
const DUMMY_TX_HASH = '0x6666666666666666666666666666666666666666666666666666666666666666';

export async function handleEvmEvent(event: SubstrateEvent): Promise<void> {
  const { block } = event;

  const transactionHash = event.extrinsic?.extrinsic.hash.toHex() || DUMMY_TX_HASH;
  let transactionIndex = NOT_EXIST_TRANSACTION_INDEX;

  try {
    const tx = getTransactionIndexAndHash(transactionHash, block.block.extrinsics, block.events);
    transactionIndex = tx.transactionIndex;
  } catch (error) {
    logger.error(error);
  }

  const transactionInfo = {
    transactionHash,
    blockNumber: block.block.header.number.toNumber(),
    blockHash: block.block.hash.toHex(),
    transactionIndex
  };

  const receiptId = `${block.block.header.number.toString()}-${event.extrinsic?.idx ?? event.phase.toString()}`;

  let ret: PartialTransactionReceipt;
  try {
    ret = getPartialTransactionReceipt(event);
  } catch (e) {
    logger.warn(e, 'event skipped due to error -- ');
    return;
  }

  const transactionReceipt = TransactionReceipt.create({
    id: receiptId,
    to: ret.to,
    from: ret.from,
    contractAddress: ret.contractAddress,
    gasUsed: ret.gasUsed.toBigInt(),
    logsBloom: ret.logsBloom,
    cumulativeGasUsed: ret.cumulativeGasUsed.toBigInt(),
    type: ret.type,
    status: ret.status,
    exitReason: ret.exitReason,
    ...transactionInfo
  });

  await transactionReceipt.save();

  for (const [idx, evmLog] of ret.logs.entries()) {
    const log = Log.create({
      id: `${receiptId}-${idx}`,
      transactionHash,
      blockNumber: block.block.header.number.toNumber(),
      blockHash: block.block.hash.toHex(),
      transactionIndex,
      removed: evmLog.removed,
      address: evmLog.address,
      data: evmLog.data,
      topics: evmLog.topics,
      logIndex: idx,
      receiptId,
      ...transactionInfo
    });

    await log.save();
  }
}
