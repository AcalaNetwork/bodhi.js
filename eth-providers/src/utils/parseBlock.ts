import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { Formatter } from '@ethersproject/providers';
import { ApiPromise } from '@polkadot/api';
import { ApiDecoration } from '@polkadot/api/types';
import { GenericExtrinsic } from '@polkadot/types';
import {
  RuntimeDispatchInfoV1,
  RuntimeDispatchInfoV2,
  DispatchInfo,
  EventRecord,
  SignedBlock
} from '@polkadot/types/interfaces';
import { FrameSystemEventRecord, FrameSupportDispatchDispatchInfo } from '@polkadot/types/lookup';
import { AnyTuple } from '@polkadot/types/types';
import { BigNumber } from 'ethers';
import { BIGNUMBER_ZERO } from '../consts';
import { findEvmEvent, getPartialTransactionReceipt, getOrphanTxReceiptsFromEvents } from './transactionReceiptHelper';
import {
  isExtrinsicFailedEvent,
  isExtrinsicSuccessEvent,
  isNormalEvmEvent,
  isTxFeeEvent,
  nativeToEthDecimal
} from './utils';

export const getAllReceiptsAtBlock = async (api: ApiPromise, blockHash: string): Promise<TransactionReceipt[]> => {
  const apiAtTargetBlock = await api.at(blockHash);

  const [block, blockEvents] = await Promise.all([
    api.rpc.chain.getBlock(blockHash),
    apiAtTargetBlock.query.system.events<FrameSystemEventRecord[]>()
  ]);

  return parseReceiptsFromBlockData(api, block, blockEvents);
};

export const parseReceiptsFromBlockData = async (
  api: ApiPromise,
  block: SignedBlock,
  blockEvents: FrameSystemEventRecord[]
): Promise<TransactionReceipt[]> => {
  const formatter = new Formatter();

  const { header } = block.block;
  const blockNumber = header.number.toNumber();
  const blockHash = header.hash.toHex();
  const _apiAtParentBlock = api.at(header.parentHash); // don't wait here in case not being used

  const normalTxs = block.block.extrinsics
    .map((extrinsic, idx) => ({
      extrinsic,
      extrinsicEvents: extractTargetEvents(blockEvents, idx)
    }))
    .filter(
      ({ extrinsicEvents }) => extrinsicEvents.some(isNormalEvmEvent) && !extrinsicEvents.find(isExtrinsicFailedEvent)
    );

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
      const logs = partialReceipt.logs.map((log) => ({
        ...txInfo,
        ...log
      }));

      return formatter.receipt({
        effectiveGasPrice,
        ...txInfo,
        ...partialReceipt,
        logs
      });
    }
  );

  const normalReceipts = await Promise.all(normalReceiptsPending);
  const orphanReceipts = getOrphanTxReceiptsFromEvents(blockEvents, blockHash, blockNumber, normalReceipts.length);

  return [...normalReceipts, ...orphanReceipts];
};

const extractTargetEvents = (allEvents: FrameSystemEventRecord[], targetIdx: number): FrameSystemEventRecord[] =>
  allEvents.filter((event) => event.phase.isApplyExtrinsic && event.phase.asApplyExtrinsic.toNumber() === targetIdx);

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

    const dispatchInfo = successEvent.event.data[0] as FrameSupportDispatchDispatchInfo | DispatchInfo;

    const actualWeight =
      (dispatchInfo as FrameSupportDispatchDispatchInfo).weight.refTime ?? (dispatchInfo as DispatchInfo).weight;

    const [paymentInfo, feeDetails] = await Promise.all([
      apiAtParentBlock.call.transactionPaymentApi.queryInfo<RuntimeDispatchInfoV1 | RuntimeDispatchInfoV2>(
        u8a,
        u8a.length
      ),
      apiAtParentBlock.call.transactionPaymentApi.queryFeeDetails(u8a, u8a.length)
    ]);

    const estimatedWeight =
      (paymentInfo as RuntimeDispatchInfoV2).weight.refTime ?? (paymentInfo as RuntimeDispatchInfoV1).weight;

    const { baseFee, lenFee, adjustedWeightFee } = feeDetails.inclusionFee.unwrap();

    const weightFee = (adjustedWeightFee.toBigInt() * actualWeight.toBigInt()) / estimatedWeight.toBigInt();
    nativeTxFee = BigNumber.from(baseFee.toBigInt() + lenFee.toBigInt() + weightFee);
  }

  let txFee = nativeToEthDecimal(nativeTxFee);

  const eventData = evmEvent.event.data;
  const usedGas = BigNumber.from(eventData[eventData.length - 2].toString());
  const usedStorage = BigNumber.from(eventData[eventData.length - 1].toString());

  // add storage fee to final txFee
  const storageDepositPerByte = api.consts.evm.storageDepositPerByte.toBigInt();
  const storageFee = usedStorage.mul(storageDepositPerByte);
  txFee = txFee.add(storageFee);

  return txFee.div(usedGas);
};
