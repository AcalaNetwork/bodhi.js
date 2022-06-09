import {
  getPartialTransactionReceipt,
  PartialTransactionReceipt,
  getTransactionIndexAndHash
} from '@acala-network/eth-providers/lib/utils/transactionReceiptHelper';
import { SubstrateEvent } from '@subql/types';
import '@polkadot/api-augment';
import { Log, TransactionReceipt } from '../types';
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber';

const NOT_EXIST_TRANSACTION_INDEX = BigInt(0xffff);
const DUMMY_TX_HASH = '0x6666666666666666666666666666666666666666666666666666666666666666';

export async function handleEvmEvent(event: SubstrateEvent): Promise<void> {
  const { block, extrinsic } = event;

  const transactionHash = extrinsic?.extrinsic.hash.toHex() || DUMMY_TX_HASH;
  let transactionIndex = NOT_EXIST_TRANSACTION_INDEX;

  try {
    const tx = getTransactionIndexAndHash(transactionHash, block.block.extrinsics, block.events);
    transactionIndex = BigInt(tx.transactionIndex);
  } catch (error) {
    logger.error(error);
  }

  const transactionInfo = {
    transactionHash,
    blockNumber: block.block.header.number.toBigInt(),
    blockHash: block.block.hash.toHex(),
    transactionIndex
  };

  /* ----------------- gasPrice  --------------------------*/
  // TODO: should be able to reuse the getEffectiveGasPrice after published new version, and remove ethers deps

  const { data: eventData, method: eventMethod } = event.event;

  let effectiveGasPrice = BigNumber.from(1);

  const gasInfoExists =
    eventData.length > 5 || (eventData.length === 5 && ['Created', 'Executed'].includes(eventMethod));

  if (gasInfoExists) {
    const used_gas = BigNumber.from(eventData[eventData.length - 2].toString());
    const used_storage = BigNumber.from(eventData[eventData.length - 1].toString());

    // FIXME: how to query prev block from subql???
    const payment = await api.rpc.payment.queryInfo(extrinsic?.extrinsic.toHex(), block.block.header.parentHash);

    // ACA/KAR decimal is 12. Mul 10^6 to make it 18.
    let tx_fee = BigNumber.from(payment.partialFee.toString(10) + '000000');

    // get storage fee
    // if used_storage > 0, tx_fee include the storage fee.
    if (used_storage.gt(0)) {
      tx_fee = tx_fee.add(used_storage.mul((api.consts.evm.storageDepositPerByte as any).toBigInt()));
    }

    effectiveGasPrice = tx_fee.div(used_gas);
  }
  /* ----------------------------------------------*/

  const receiptId = `${block.block.header.number.toString()}-${extrinsic?.idx ?? event.phase.toString()}`;

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
    // effectiveGasPrice: effectiveGasPrice.toBigInt(),
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
      blockNumber: block.block.header.number.toBigInt(),
      blockHash: block.block.hash.toHex(),
      transactionIndex,
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
