import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { keccak256 } from '@ethersproject/keccak256';
import { Formatter } from '@ethersproject/providers';
import { ApiPromise } from '@polkadot/api';
import { ApiDecoration } from '@polkadot/api/types';
import { GenericExtrinsic } from '@polkadot/types';
import { RuntimeDispatchInfoV1, RuntimeDispatchInfoV2, DispatchInfo, EventRecord, SignedBlock } from '@polkadot/types/interfaces';
import { FrameSystemEventRecord, FrameSupportDispatchDispatchInfo } from '@polkadot/types/lookup';
import { AnyTuple } from '@polkadot/types/types';
import { nToU8a } from '@polkadot/util';
import { BigNumber } from 'ethers';
import { BIGNUMBER_ZERO } from 'src/consts';
import { findEvmEvent, getPartialTransactionReceipt, getOrphanTxReceiptsFromEvents } from './transactionReceiptHelper';
import { isNormalEvmEvent, isTxFeeEvent, nativeToEthDecimal } from './utils';

export const getAllReceiptsAtBlock = async (
  api: ApiPromise,
  blockHash: string,
): Promise<TransactionReceipt[]> => {
  const apiAtTargetBlock = await api.at(blockHash);

  const [block, blockEvents] = await Promise.all([
    api.rpc.chain.getBlock(blockHash),
    apiAtTargetBlock.query.system.events<FrameSystemEventRecord[]>(),
  ]);

  return parseReceiptsFromBlockData(api, block, blockEvents);
};

const parseReceiptsFromBlockData = async (
  api: ApiPromise,
  block: SignedBlock,
  blockEvents: FrameSystemEventRecord[],
): Promise<TransactionReceipt[]> => {
  const formatter = new Formatter();

  const { header } = block.block;
  const blockNumber = header.number.toNumber();
  const blockHash = header.hash.toHex();
  const _apiAtParentBlock = api.at(header.parentHash);   // don't wait here in case not being used

  const normalTxs = block.block.extrinsics
    .map((extrinsic, idx) => ({
      extrinsic,
      extrinsicEvents: extractTargetEvents(blockEvents, idx),
    }))
    .filter(({ extrinsicEvents }) => extrinsicEvents.some(isNormalEvmEvent));

  const normalReceiptsPending: Promise<TransactionReceipt | null>[] = normalTxs.map(
    async ({ extrinsicEvents, extrinsic }, transactionIndex) => {
      const extrinsicFailed = extrinsicEvents.some(
        event => event.event.method === 'ExtrinsicFailed'
      );

      if (extrinsicFailed) {
        return null;
      }

      const evmEvent = findEvmEvent(extrinsicEvents);
      if (!evmEvent) {
        throw new Error('cannot find evmEvent');
      }

      const isErc20Xcm = extrinsic.method.method.toString() === 'setValidationData';
      const transactionHash = isErc20Xcm
        ? getErc20XcmTxHash(extrinsic, transactionIndex)
        : extrinsic.hash.toHex();

      const effectiveGasPrice = isErc20Xcm
        ? BIGNUMBER_ZERO
        : await getEffectiveGasPrice(
          api,
          _apiAtParentBlock,
          extrinsic,
          extrinsicEvents,
          evmEvent
        );

      const txInfo = { transactionIndex, blockHash, transactionHash, blockNumber };
      const partialReceipt = getPartialTransactionReceipt(evmEvent);
      const logs = partialReceipt.logs.map((log) => ({
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

  const normalReceipts = (await Promise.all(normalReceiptsPending))
    .filter((r): r is TransactionReceipt => r !== null);    // filter out failed extrinsic

  const orphanReceipts = getOrphanTxReceiptsFromEvents(
    blockEvents,
    blockHash,
    blockNumber,
    normalReceipts.length,
  );

  return [
    ...normalReceipts,
    ...orphanReceipts,
  ];
};

const getErc20XcmTxHash = (
  extrinsic: GenericExtrinsic<AnyTuple>,
  transactionIndex: number
): string => keccak256([
  ...extrinsic.hash.toU8a(),
  ...nToU8a(transactionIndex),
]);

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
  evmEvent: EventRecord,
): Promise<BigNumber> => {
  let nativeTxFee: BigNumber;

  const txFeeEvent = extrinsicEvents.find(isTxFeeEvent);
  if (txFeeEvent) {
    // [who, actualFee, actualTip, actualSurplus]
    nativeTxFee = BigNumber.from(txFeeEvent.event.data[1].toString());
  } else {
    const systemEvent = extrinsicEvents.find(
      event => event.event.method === 'ExtrinsicSuccess'
    );
    if (!systemEvent) {
      throw new Error('cannot find system event');
    }

    const u8a = extrinsic.toU8a();
    const apiAtParentBlock = await _apiAtParentBlock;

    const dispatchInfo = systemEvent.event.data[0] as FrameSupportDispatchDispatchInfo | DispatchInfo;
    const actualWeight =
      (dispatchInfo as FrameSupportDispatchDispatchInfo).weight.refTime ?? (dispatchInfo as DispatchInfo).weight;

    const paymentInfo = await apiAtParentBlock.call.transactionPaymentApi.queryInfo<RuntimeDispatchInfoV1 | RuntimeDispatchInfoV2>(u8a, u8a.length);
    const estimatedWeight =
      (paymentInfo as RuntimeDispatchInfoV2).weight.refTime ??
      (paymentInfo as RuntimeDispatchInfoV1).weight;

    const { inclusionFee } = await apiAtParentBlock.call.transactionPaymentApi.queryFeeDetails(u8a, u8a.length);
    const { baseFee, lenFee, adjustedWeightFee } = inclusionFee.unwrap();

    const weightFee = (adjustedWeightFee.toBigInt() * actualWeight.toBigInt()) / estimatedWeight.toBigInt();
    nativeTxFee = BigNumber.from(baseFee.toBigInt() + lenFee.toBigInt() + weightFee);
  }

  let txFee = nativeToEthDecimal(nativeTxFee, 12);

  const eventData = evmEvent.event.data;
  const usedGas = BigNumber.from(eventData[eventData.length - 2].toString());
  const usedStorage = BigNumber.from(eventData[eventData.length - 1].toString());

  // add storage fee to final txFee
  const storageDepositPerByte = api.consts.evm.storageDepositPerByte.toBigInt();
  const storageFee = usedStorage.mul(storageDepositPerByte);
  txFee = txFee.add(storageFee);

  return txFee.div(usedGas);
};
