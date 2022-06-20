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

export async function handleEvmExtrinsic(block: SubstrateBlock, extrinsic: Extrinsic): Promise<void> {
  const blockHash = block.block.hash.toHex();
  const blockNumber = block.block.header.number.toBigInt();
  const blockEvents = block.events;
  const txHash = extrinsic.hash.toHex();

  let transactionIndex: number;
  let transactionHash: string;
  let isExtrinsicFailed: boolean;
  let extrinsicIndex: number;
  try {
    ({ transactionHash, transactionIndex, extrinsicIndex, isExtrinsicFailed } = getTransactionIndexAndHash(
      txHash,
      block.block.extrinsics,
      blockEvents
    ));
  } catch (e) {
    logger.warn(
      `❗️ non evm extrinsic skipped, this is usually a dex.xxx operation that does not involve any erc20 tokens. ${JSON.stringify(
        { blockNumber: blockNumber.toString(), txHash }
      )}`
    );
    return;
  }

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
  const TARGET_MODULES = ['EVM', 'DEX'];
  const targetExtrinsics = block.block.extrinsics.filter((e) =>
    TARGET_MODULES.includes(e.method.section.toUpperCase())
  );

  await Promise.all(targetExtrinsics.map((e) => handleEvmExtrinsic(block, e)));
}
