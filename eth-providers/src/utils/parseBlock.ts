import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { Formatter } from '@ethersproject/providers';
import { ApiPromise } from '@polkadot/api';
import { RuntimeDispatchInfoV2 } from '@polkadot/types/interfaces';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
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
    const failedEvent = extrinsicEvents.find(
      event => event.event.method === 'ExtrinsicFailed'
    );

    if (failedEvent) {
      // deal with failed event
      // maybe just ignore this tx?
    }

    const evmEvent = findEvmEvent(extrinsicEvents);
    if (!evmEvent) {
      throw new Error('cannot find evmEvent failed');
    }
    
    const transactionHash = extrinsic.hash.toHex();
    const partialReceipt = getPartialTransactionReceipt(evmEvent);
    const txInfo = { transactionIndex, blockHash, transactionHash, blockNumber };

    /* ----- gas ----- */
    const txFeeEvent = extrinsicEvents.find(({ event }) => (
      event.section.toUpperCase() === 'TRANSACTIONPAYMENT' &&
      event.method === 'TransactionFeePaid'
    ));

    let nativeTxFee: BigNumber;
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

      const apiAtParentBlock = await _apiAtParentBlock;

      const { weight: actualWeight } = (systemEvent.event.data.toJSON() as any)[0]; // TODO: fix type
      const u8a = extrinsic.toU8a();

      const paymentInfo = await apiAtParentBlock.call.transactionPaymentApi.queryInfo<RuntimeDispatchInfoV2>(u8a, u8a.length);
      const estimatedWeight = paymentInfo.weight.refTime ?? paymentInfo.weight;

      const { inclusionFee } = await apiAtParentBlock.call.transactionPaymentApi.queryFeeDetails(u8a, u8a.length);
      const { baseFee, lenFee, adjustedWeightFee } = inclusionFee.unwrap();

      const weightFee = (adjustedWeightFee.toBigInt() * BigInt(actualWeight)) / estimatedWeight.toBigInt();
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

    const effectiveGasPrice = txFee.div(usedGas);

    return formatter.receipt({
      effectiveGasPrice,
      confirmations: curBlockNumber - blockNumber,
      ...txInfo,
      ...partialReceipt,
      logs: partialReceipt.logs.map((log) => ({
        ...txInfo,
        ...log,
      })),
    });
  });

  return Promise.all(receipts);
};
