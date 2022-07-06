import {
  getPartialTransactionReceipt,
  PartialTransactionReceipt,
  getTransactionIndexAndHash,
  getEffectiveGasPrice,
  findEvmEvent
} from '@acala-network/eth-providers/lib/utils/transactionReceiptHelper';
import { EventData } from '@acala-network/eth-providers/lib/base-provider';
import { SubstrateEvent, SubstrateBlock } from '@subql/types';
import '@polkadot/api-augment';
import { Log, TransactionReceipt } from '../types';
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber';
import { Extrinsic } from '@polkadot/types/interfaces';

export async function handleEvmExtrinsic(
  block: SubstrateBlock,
  extrinsic: Extrinsic,
  evmInfo: ReturnType<typeof getTransactionIndexAndHash>
): Promise<void> {
  const blockHash = block.block.hash.toHex();
  const blockNumber = block.block.header.number.toBigInt();
  const blockEvents = block.events;
  const txHash = extrinsic.hash.toHex();

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

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  const blockHash = block.block.hash.toHex();
  const blockNumber = block.block.header.number.toBigInt();
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

  await Promise.all(evmExtrinsics.map(({ extrinsic, ...evmInfo }) => handleEvmExtrinsic(block, extrinsic, evmInfo)));
}
