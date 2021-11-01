import { getPartialTransactionReceipt } from '@acala-network/eth-providers';
import { SubstrateEvent } from '@subql/types';
import { Log, TransactionReceipt } from '../types';

const NOT_EXIST_TRANSACTION_INDEX = 0xffff;

export async function handleEvmEvent(event: SubstrateEvent): Promise<void> {
  const { block } = event;

  const txIdx = event.extrinsic?.idx ?? NOT_EXIST_TRANSACTION_INDEX;

  const transactionInfo = {
    transactionHash: event.extrinsic.extrinsic.hash.toHex(),
    blockNumber: block.block.header.number.toNumber(),
    blockHash: block.block.hash,
    transactionIndex: txIdx
  };

  const receiptId = `${block.block.header.number.toString()}-${event.extrinsic?.idx ?? event.phase.toString()}`;

  const ret = getPartialTransactionReceipt(event);

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
    ...transactionInfo
  });

  await transactionReceipt.save();

  for (const [idx, evmLog] of ret.logs.entries()) {
    const log = Log.create({
      id: `${receiptId}-${idx}`,
      transactionHash: event.extrinsic.extrinsic.hash.toHex(),
      blockNumber: block.block.header.number.toNumber(),
      blockHash: block.block.hash.toHex(),
      transactionIndex: txIdx,
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
