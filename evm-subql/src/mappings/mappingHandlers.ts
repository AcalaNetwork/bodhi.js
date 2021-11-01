import type { EvmLog, H160 } from '@polkadot/types/interfaces/types';
import { SubstrateEvent } from '@subql/types';
import { Log, TransactionReceipt } from '../types';

const NOT_EXIST_TRANSACTION_INDEX = 0xffff;

export async function handleEvmEvent(event: SubstrateEvent): Promise<void> {
  const { block } = event;

  const txIdx = event.extrinsic?.idx ?? NOT_EXIST_TRANSACTION_INDEX;

  const createLog = async (receiptId: string, idx: number, evmLog: EvmLog) => {
    const log = Log.create({
      id: `${receiptId}-${idx}`,
      transactionHash: event.extrinsic.extrinsic.hash.toHex(),
      blockNumber: block.block.header.number.toNumber(),
      blockHash: block.block.hash.toHex(),
      transactionIndex: txIdx,
      removed: false,
      address: evmLog.address.toString().toLowerCase(),
      data: evmLog.address.toString().toLowerCase(),
      topics: evmLog.topics.toJSON(),
      logIndex: idx,
      receiptId
    });

    await log.save();
  };

  const processEvent = (id: string) => {
    switch (event.event.method) {
      case 'Created': {
        const [source, evmAddress, logs] = event.event.data as unknown as [H160, H160, EvmLog[]];

        return [
          TransactionReceipt.create({
            id,
            to: null,
            from: source.toHex(),
            contractAddress: evmAddress.toString(),
            logsBloom: '0x', // @Todo
            status: 1
          }),
          logs
        ] as [TransactionReceipt, EvmLog[]];
      }
      case 'Executed': {
        const [source, evmAddress, logs] = event.event.data as unknown as [H160, H160, EvmLog[]];

        return [
          TransactionReceipt.create({
            id,
            to: evmAddress.toString(),
            from: source.toHex(),
            contractAddress: evmAddress.toString(),
            logsBloom: '0x', // @Todo
            status: 1
          }),
          logs
        ] as [TransactionReceipt, EvmLog[]];
      }
      case 'CreatedFailed': {
        const [source, evmAddress, _exitReason, logs] = event.event.data as unknown as [H160, H160, unknown, EvmLog[]];

        return [
          TransactionReceipt.create({
            id,
            to: null,
            from: source.toHex(),
            contractAddress: evmAddress.toString(),
            logsBloom: '0x', // @Todo
            status: 0
          }),
          logs
        ] as [TransactionReceipt, EvmLog[]];
      }
      case 'ExecutedFailed': {
        const [source, evmAddress, _exitReason, _output, logs] = event.event.data as unknown as [
          H160,
          H160,
          unknown,
          unknown,
          EvmLog[]
        ];

        return [
          TransactionReceipt.create({
            id,
            to: evmAddress.toString(),
            from: source.toHex(),
            contractAddress: null,
            logsBloom: '0x', // @Todo
            status: 0
          }),
          logs
        ] as [TransactionReceipt, EvmLog[]];
      }
    }

    return null;
  };

  const ret = processEvent(`${block.block.header.number.toString()}-${event.extrinsic?.idx ?? event.phase.toString()}`);
  if (!ret) {
    logger.debug(`Unsupported event: ${event.event.method}`);
    return;
  }

  const [transactionReceipt, logs] = ret;
  (transactionReceipt.blockHash = block.block.hash.toHex()),
    (transactionReceipt.transactionHash = event.extrinsic.extrinsic.hash.toHex()),
    (transactionReceipt.blockNumber = BigInt(block.block.header.number.toNumber())),
    (transactionReceipt.transactionIndex = BigInt(txIdx));
  transactionReceipt.gasUsed = BigInt(0); // @Todo
  transactionReceipt.cumulativeGasUsed = BigInt(0); // @Todo

  await transactionReceipt.save();
  logs.forEach((evmLog, idx) => createLog(transactionReceipt.id, idx, evmLog));
}
