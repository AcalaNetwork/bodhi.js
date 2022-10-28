import {
  getPartialTransactionReceipt,
  PartialTransactionReceipt,
  getTransactionIndexAndHash,
  getEffectiveGasPrice,
  findEvmEvent
} from '@acala-network/eth-providers/lib/utils';
import { EventData } from '@acala-network/eth-providers/lib/base-provider';
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber';
import { keccak256 } from 'ethers/lib/utils';
import '@polkadot/api-augment';
import { EventRecord, Extrinsic } from '@polkadot/types/interfaces';
import { hexToU8a, nToU8a } from '@polkadot/util';
import { SubstrateBlock } from '@subql/types';
import { Log, TransactionReceipt } from '../types';

export async function handleEvmExtrinsic(
  block: SubstrateBlock,
  extrinsic: Extrinsic,
  evmInfo: ReturnType<typeof getTransactionIndexAndHash>
): Promise<void> {
  const blockHash = block.block.hash.toHex();
  const blockNumber = block.block.header.number.toBigInt();
  const blockEvents = block.events;
  const timestamp = block.timestamp;

  const { transactionHash, transactionIndex, extrinsicIndex, isExtrinsicFailed } = evmInfo;

  const extrinsicEvents = blockEvents.filter(
    (event) => event.phase.isApplyExtrinsic && event.phase.asApplyExtrinsic.toNumber() === extrinsicIndex
  );

  const evmEvent = findEvmEvent(extrinsicEvents);
  const systemEvent = extrinsicEvents.find((event) =>
    ['ExtrinsicSuccess', 'ExtrinsicFailed'].includes(event.event.method)
  );

  const { weight: actualWeight } = (systemEvent.event.data.toJSON() as EventData)[0];

  let ret: PartialTransactionReceipt;
  let effectiveGasPrice: BigNumber;
  try {
    ret = getPartialTransactionReceipt(evmEvent);
    effectiveGasPrice = await getEffectiveGasPrice(evmEvent, global.unsafeApi, blockHash, extrinsic, actualWeight);
  } catch (e) {
    logger.warn(e, '❗️ event skipped due to error -- ');
    return;
  }

  const transactionInfo = {
    transactionIndex: BigInt(transactionIndex),
    blockHash,
    transactionHash,
    blockNumber
  };

  const receiptId = `${blockNumber.toString()}-${extrinsicIndex}`;

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
    timestamp,
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
      timestamp,
      ...transactionInfo
    });

    await log.save();
  }
}

export async function handleOrphanEvmEvent(
  event: EventRecord,
  idx: number,
  block: SubstrateBlock,
  indexOffset: number
): Promise<void> {
  const blockHash = block.block.hash.toHex();
  const blockNumber = block.block.header.number.toBigInt();
  const timestamp = block.timestamp;

  let partialReceipt;

  try {
    partialReceipt = getPartialTransactionReceipt(event);
  } catch (e) {
    logger.warn(e, '❗️ event skipped due to error -- ');
    return;
  }

  const transactionHash = keccak256([...hexToU8a(blockHash), ...nToU8a(idx)]);
  const receiptId = `${blockNumber.toString()}-${transactionHash.substring(54)}`;

  const transactionInfo = {
    transactionIndex: BigInt(idx + indexOffset),
    blockHash,
    transactionHash,
    blockNumber
  };

  const transactionReceipt = TransactionReceipt.create({
    id: receiptId,
    ...partialReceipt,
    gasUsed: partialReceipt.gasUsed.toBigInt(),
    effectiveGasPrice: BigInt(0),
    cumulativeGasUsed: partialReceipt.cumulativeGasUsed.toBigInt(),
    type: BigInt(partialReceipt.type),
    status: BigInt(partialReceipt.status),
    timestamp,
    ...transactionInfo
  });

  await transactionReceipt.save();

  for (const [idx, rawLog] of partialReceipt.logs.entries()) {
    const log = Log.create({
      id: `${receiptId}-${idx}`,
      receiptId,
      timestamp,
      ...rawLog,
      ...transactionInfo
    });

    await log.save();
  }
}

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  const blockEvents = block.events;
  const { extrinsics } = block.block;

  const evmExtrinsics = extrinsics
    .map((extrinsic) => {
      try {
        const evmInfo = getTransactionIndexAndHash(extrinsic.hash.toHex(), extrinsics, blockEvents);

        return { extrinsic, ...evmInfo };
      } catch (e) {
        // throw error means this transaction is not related to evm
        return null;
      }
    })
    .filter((x) => !!x);

  // TODO: reuse isOrphanEvmEvent
  const orphanEvmEvents = blockEvents.filter(
    (e) =>
      e.event.section.toLowerCase() === 'evm' &&
      ['Created', 'Executed', 'CreatedFailed', 'ExecutedFailed'].includes(e.event.method) &&
      !e.phase.isApplyExtrinsic
  );

  await Promise.all([
    ...orphanEvmEvents.map((e, i) => handleOrphanEvmEvent(e, i, block, evmExtrinsics.length)),
    ...evmExtrinsics.map(({ extrinsic, ...evmInfo }) => handleEvmExtrinsic(block, extrinsic, evmInfo))
  ]);
}
