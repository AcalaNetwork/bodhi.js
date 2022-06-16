import {
  getPartialTransactionReceipt,
  PartialTransactionReceipt,
  getTransactionIndexAndHash,
  getEffectiveGasPrice
} from '@acala-network/eth-providers/lib/utils/transactionReceiptHelper';
import { EventData } from '@acala-network/eth-providers/lib/base-provider';
import { SubstrateEvent } from '@subql/types';
import '@polkadot/api-augment';
import { Log, TransactionReceipt } from '../types';
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber';

export async function handleEvmEvent(event: SubstrateEvent): Promise<void> {
  const { block, extrinsic } = event;

  const blockHash = block.block.hash.toHex();
  const blockNumber = block.block.header.number.toBigInt();
  const blockEvents = block.events;

  const { transactionHash, transactionIndex, extrinsicIndex, isExtrinsicFailed } = getTransactionIndexAndHash(
    extrinsic.extrinsic.hash.toHex(),
    block.block.extrinsics,
    blockEvents
  );

  const extrinsicEvents = blockEvents.filter(
    (event) => event.phase.isApplyExtrinsic && event.phase.asApplyExtrinsic.toNumber() === extrinsicIndex
  );

  const systemEvent = extrinsicEvents.find((event) =>
    ['ExtrinsicSuccess', 'ExtrinsicFailed'].includes(event.event.method)
  );

  const { weight: actualWeight } = (systemEvent.event.data.toJSON() as EventData)[0];

  // error handleing

  let ret: PartialTransactionReceipt;
  let effectiveGasPrice: BigNumber;
  try {
    ret = getPartialTransactionReceipt(event);
    effectiveGasPrice = await getEffectiveGasPrice(
      event,
      global.unsafeApi,
      blockHash,
      extrinsic.extrinsic,
      actualWeight
    );
  } catch (e) {
    logger.warn(e, 'event skipped due to error -- ');
    return;
  }

  const transactionInfo = {
    transactionIndex: BigInt(transactionIndex),
    blockHash,
    transactionHash,
    blockNumber
  };

  const receiptId = `${block.block.header.number.toString()}-${extrinsic?.idx ?? event.phase.toString()}`;

  const transactionReceipt = TransactionReceipt.create({
    id: receiptId,
    to: ret.to,
    from: ret.from,
    contractAddress: ret.contractAddress,
    gasUsed: ret.gasUsed.toBigInt(),
    logsBloom: ret.logsBloom,
    effectiveGasPrice: effectiveGasPrice.toBigInt(),
    cumulativeGasUsed: ret.cumulativeGasUsed.toBigInt(),
    type: BigInt(ret.type),
    status: BigInt(ret.status),
    exitReason: ret.exitReason,
    ...transactionInfo
  });

  await transactionReceipt.save();

  for (const [idx, evmLog] of ret.logs.entries()) {
    const log = Log.create({
      id: `${receiptId}-${idx}`,
      transactionHash,
      blockNumber,
      blockHash,
      transactionIndex: BigInt(transactionIndex),
      removed: evmLog.removed,
      address: evmLog.address,
      data: evmLog.data,
      topics: evmLog.topics,
      logIndex: BigInt(idx),
      receiptId,
      ...transactionInfo
    });

    await log.save();
  }
}
