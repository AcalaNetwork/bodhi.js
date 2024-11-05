import { AnyTuple } from '@polkadot/types/types';
import { ApiDecoration } from '@polkadot/api/types';
import { ApiPromise } from '@polkadot/api';
import { BigNumber } from 'ethers';
import {
  EventRecord,
  RuntimeDispatchInfoV1,
  RuntimeDispatchInfoV2,
  SignedBlock,
  WeightV1,
  WeightV2,
} from '@polkadot/types/interfaces';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { GenericExtrinsic } from '@polkadot/types';
import { TransactionReceipt } from '@ethersproject/abstract-provider';

import { BIGNUMBER_ZERO, ONE_HUNDRED_GWEI } from '../consts';
import { apiCache } from './ApiAtCache';
import {
  findEvmEvent,
  formatter,
  getOrphanTxReceiptsFromEvents,
  getPartialTransactionReceipt,
} from './receiptHelper';
import {
  isBatchResultEvent,
  isEvmEvent,
  isExtrinsicFailedEvent,
  isExtrinsicSuccessEvent,
  isNormalEvmEvent,
  isOrphanEvmEvent,
  isTxFeeEvent,
  nativeToEthDecimal,
} from './utils';

export const getAllReceiptsAtBlock = async (
  api: ApiPromise,
  blockHash: string,
  targetTxHash?: string
): Promise<TransactionReceipt[]> => {
  const apiAt = await apiCache.getApiAt(api, blockHash);

  const [block, blockEvents] = await Promise.all([
    api.rpc.chain.getBlock(blockHash),
    apiAt.query.system.events(),
  ]);

  return await parseReceiptsFromBlockData(api, block, blockEvents, targetTxHash, true);
};

export const parseReceiptsFromBlockData = async (
  api: ApiPromise,
  block: SignedBlock,
  blockEvents: FrameSystemEventRecord[],
  targetTxHash?: string,
  // this method is also used by subql, so disable cacheing by default to avoid potential compatibilty issues
  useCache: boolean = false,
): Promise<TransactionReceipt[]> => {
  const { header } = block.block;
  const blockNumber = header.number.toNumber();
  const blockHash = header.hash.toHex();

  // don't wait here in case not being used
  const _apiAtParentBlock = useCache
    ? apiCache.getApiAt(api, header.parentHash.toHex())
    : api.at(header.parentHash);

  const succeededEvmExtrinsics = block.block.extrinsics
    .map((extrinsic, idx) => {
      const extrinsicEvents = extractTargetEvents(blockEvents, idx);
      const isBatch = extrinsicEvents.some(isBatchResultEvent);

      return { extrinsic, extrinsicEvents, isBatch };
    })
    .filter(({ extrinsicEvents }) => (
      extrinsicEvents.some(isNormalEvmEvent) &&
      !extrinsicEvents.find(isExtrinsicFailedEvent)
    ));

  let normalTxs = succeededEvmExtrinsics.filter(({ isBatch }) => !isBatch);
  const batchTxs = succeededEvmExtrinsics.filter(({ isBatch }) => isBatch);

  if (targetTxHash) {
    normalTxs = normalTxs.filter(({ extrinsic }) => extrinsic.hash.toHex() === targetTxHash);
  }

  const normalReceiptsPending: Promise<TransactionReceipt>[] = normalTxs.map(
    async ({ extrinsicEvents, extrinsic }, transactionIndex) => {
      const evmEvent = findEvmEvent(extrinsicEvents);
      if (!evmEvent) {
        throw new Error(`cannot find evmEvent: ${JSON.stringify(extrinsicEvents)}`);
      }

      const isErc20Xcm = extrinsic.method.method.toString() === 'setValidationData';
      const effectiveGasPrice = isErc20Xcm
        ? BIGNUMBER_ZERO
        : await getEffectiveGasPrice(api, _apiAtParentBlock, extrinsic, extrinsicEvents, evmEvent);

      const transactionHash = extrinsic.hash.toHex();
      const txInfo = { transactionIndex, blockHash, transactionHash, blockNumber };
      const partialReceipt = getPartialTransactionReceipt(evmEvent);
      const logs = partialReceipt.logs.map(log => ({
        ...txInfo,
        ...log,
      }));

      return formatter.receipt({
        effectiveGasPrice,
        ...txInfo,
        ...partialReceipt,
        logs,
      });
    }
  );

  const normalReceipts = await Promise.all(normalReceiptsPending);

  const batchEvmEvents = batchTxs
    .map(tx => tx.extrinsicEvents)
    .flat()
    .filter(isEvmEvent);

  const orphanEvents = blockEvents
    .filter(isOrphanEvmEvent)
    .concat(batchEvmEvents);    // batch evm events are treated as orphan events

  const orphanReceipts = getOrphanTxReceiptsFromEvents(orphanEvents, blockHash, blockNumber, normalReceipts.length);
  const allCandidateReceipts = [...normalReceipts, ...orphanReceipts];

  return targetTxHash
    ? allCandidateReceipts.filter(r => r.transactionHash === targetTxHash)
    : allCandidateReceipts;
};

const extractTargetEvents = (
  allEvents: FrameSystemEventRecord[],
  targetIdx: number,
): FrameSystemEventRecord[] => allEvents.filter(event => (
  event.phase.isApplyExtrinsic &&
  event.phase.asApplyExtrinsic.toNumber() === targetIdx
));

const getEffectiveGasPrice = async (
  api: ApiPromise,
  _apiAtParentBlock: Promise<ApiDecoration<'promise'>>,
  extrinsic: GenericExtrinsic<AnyTuple>,
  extrinsicEvents: FrameSystemEventRecord[],
  evmEvent: EventRecord
): Promise<BigNumber> => {
  let nativeTxFee: BigNumber;

  const txFeeEvent = extrinsicEvents.find(isTxFeeEvent);
  if (txFeeEvent) {
    // [who, actualFee, actualTip, actualSurplus]
    nativeTxFee = BigNumber.from(txFeeEvent.event.data[1].toString());
  } else {
    const u8a = extrinsic.toU8a();
    const apiAtParentBlock = await _apiAtParentBlock;

    const successEvent = extrinsicEvents.find(isExtrinsicSuccessEvent);
    if (!successEvent) {
      throw new Error(`cannot find extrinsic success event: ${JSON.stringify(extrinsicEvents)}`);
    }

    const dispatchInfo = successEvent.event.data[0];
    const actualWeight =
      ((dispatchInfo as any).weight as WeightV2).refTime ??
      (dispatchInfo as any).weight as WeightV1;

    const [paymentInfo, feeDetails] = await Promise.all([
      apiAtParentBlock.call.transactionPaymentApi.queryInfo<RuntimeDispatchInfoV1 | RuntimeDispatchInfoV2>(u8a, u8a.length), // eslint-disable-line
      apiAtParentBlock.call.transactionPaymentApi.queryFeeDetails(u8a, u8a.length),
    ]);

    const estimatedWeight =
      (paymentInfo as RuntimeDispatchInfoV2).weight?.refTime ??
      (paymentInfo as RuntimeDispatchInfoV1).weight;

    const { baseFee, lenFee, adjustedWeightFee } = feeDetails.inclusionFee.unwrap();

    const weightFee = (adjustedWeightFee.toBigInt() * actualWeight.toBigInt()) / estimatedWeight.toBigInt();
    nativeTxFee = BigNumber.from(baseFee.toBigInt() + lenFee.toBigInt() + weightFee);
  }

  let txFee = nativeToEthDecimal(nativeTxFee);

  const eventData = evmEvent.event.data;
  const usedGas = BigNumber.from(eventData[eventData.length - 2].toString());
  const usedStorage = BigNumber.from(eventData[eventData.length - 1].toString());

  if (usedGas.eq(0)) return BigNumber.from(ONE_HUNDRED_GWEI);

  if (usedStorage.gt(0)) {
    // ignore storage refund (usedStorage < 0) since it might result in negative gas
    const storageDepositPerByte = api.consts.evm.storageDepositPerByte.toBigInt();
    const storageFee = usedStorage.mul(storageDepositPerByte);
    txFee = txFee.add(storageFee);
  }

  return txFee.div(usedGas);
};
