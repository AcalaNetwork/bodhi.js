import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { keccak256 } from '@ethersproject/keccak256';
import { Formatter } from '@ethersproject/providers';
import { ApiPromise } from '@polkadot/api';
import { GenericExtrinsic } from '@polkadot/types';
import { RuntimeDispatchInfoV1, RuntimeDispatchInfoV2, DispatchInfo } from '@polkadot/types/interfaces';
import { FrameSystemEventRecord, FrameSupportDispatchDispatchInfo } from '@polkadot/types/lookup';
import { AnyTuple } from '@polkadot/types/types';
import { nToU8a } from '@polkadot/util';
import { BigNumber } from 'ethers';
import { findEvmEvent, getPartialTransactionReceipt } from './transactionReceiptHelper';
import { nativeToEthDecimal } from './utils';

export const getAllReceiptsAtBlock = async (api: ApiPromise, blockHash: string): Promise<TransactionReceipt[]> => {
  const apiAtTargetBlock = await api.at(blockHash);

  const [block, blockEvents, curBlockHeader] = await Promise.all([
    api.rpc.chain.getBlock(blockHash),
    apiAtTargetBlock.query.system.events<FrameSystemEventRecord[]>(),
    api.rpc.chain.getHeader(),
  ]);

  const blockNumber = block.block.header.number.toNumber();
  const curBlockNumber = curBlockHeader.number.toNumber();

  const formatter = new Formatter();

  const normalTxs = block.block.extrinsics
    .map((extrinsic, idx) => ({ extrinsic, rawIdx: idx }))
    .map(({ extrinsic, rawIdx }) => {
      const extrinsicEvents = blockEvents.filter(event => (
        event.phase.isApplyExtrinsic &&
        event.phase.asApplyExtrinsic.toNumber() === rawIdx
      ));

      return {
        extrinsicEvents,
        extrinsic,
      };
    })
    .filter(({ extrinsicEvents }) => {
      for (const event of extrinsicEvents) {
        if (
          event.phase.isApplyExtrinsic &&
          event.event.section.toUpperCase() === 'EVM' &&
          [ 'Created',
            'CreatedFailed',
            'Executed',
            'ExecutedFailed',
          ].includes(event.event.method)
        ) { return true; }
      }

      return false;
    });

  const parentHash = block.block.header.parentHash;
  const _apiAtParentBlock = api.at(parentHash);
  
  const receipts: Promise<TransactionReceipt>[] = normalTxs.map(async ({ extrinsicEvents, extrinsic }, transactionIndex) => {
    const isErc20Xcm = extrinsic.method.method.toString() === 'setValidationData';

    const failedEvent = extrinsicEvents.find(
      event => event.event.method === 'ExtrinsicFailed'
    );

    if (failedEvent) {
      // TODO: deal with failed event
      // maybe just ignore this tx?
    }

    const evmEvent = findEvmEvent(extrinsicEvents);
    if (!evmEvent) {
      throw new Error('cannot find evmEvent failed');
    }
    
    const transactionHash = isErc20Xcm
      ? getErc20XcmTxHash(extrinsic, transactionIndex)
      : extrinsic.hash.toHex();

    const txInfo = { transactionIndex, blockHash, transactionHash, blockNumber };

    /* ----- gas ----- */
    let effectiveGasPrice = BigNumber.from(0);
    if (!isErc20Xcm) {
      let nativeTxFee: BigNumber;

      const txFeeEvent = extrinsicEvents.find(({ event }) => (
        event.section.toUpperCase() === 'TRANSACTIONPAYMENT' &&
        event.method === 'TransactionFeePaid'
      ));

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

      effectiveGasPrice = txFee.div(usedGas);
    }

    const confirmations = curBlockNumber - blockNumber;
    const partialReceipt = getPartialTransactionReceipt(evmEvent);
    const logs = partialReceipt.logs.map((log) => ({
      ...txInfo,
      ...log,
    }));

    return formatter.receipt({
      effectiveGasPrice,
      confirmations,
      ...txInfo,
      ...partialReceipt,
      logs,
    });
  });

  return Promise.all(receipts);
};

const getErc20XcmTxHash = (
  extrinsic: GenericExtrinsic<AnyTuple>,
  transactionIndex: number
): string => keccak256([...extrinsic.hash.toU8a(), ...nToU8a(transactionIndex)]);
