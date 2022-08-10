import { BigNumber } from '@ethersproject/bignumber';
import { hexValue, isHexString } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { Formatter, TransactionReceipt } from '@ethersproject/providers';
import { keccak256 } from 'ethers/lib/utils';
import { ApiPromise } from '@polkadot/api';
import type { GenericExtrinsic, i32, u64 } from '@polkadot/types';
import type { EventRecord } from '@polkadot/types/interfaces';
import type { EvmLog, H160, ExitReason } from '@polkadot/types/interfaces/types';
import type { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { AnyTuple } from '@polkadot/types/types';
import { Vec } from '@polkadot/types';
import { hexToU8a, nToU8a } from '@polkadot/util';
import { BIGNUMBER_ONE, BIGNUMBER_ZERO, DUMMY_V_R_S } from '../consts';
import { logger } from './logger';
import { isOrphanEvmEvent, nativeToEthDecimal } from './utils';

export interface PartialLog {
  removed: boolean;
  address: string;
  data: string;
  topics: string[];
  logIndex: number;
}

// TODO: where to find the actual shape?
export interface ExtrinsicMethodJSON {
  callIndex: string;
  args: {
    action?: {
      [key: string]: string;
    };
    init?: string;
    input?: string;
    target?: string;
    value: number;
    gas_limit: number;
    storage_limit: number;
    access_list: any[];
    valid_until?: number;
  };
}

export const getPartialLog = (evmLog: EvmLog, logIndex: number): PartialLog => {
  return {
    removed: false,
    address: evmLog.address.toString().toLowerCase(),
    data: evmLog.data.toString().toLowerCase(),
    topics: evmLog.topics.toJSON() as any,
    logIndex: logIndex
  };
};

export const getPartialLogs = (evmLogs: EvmLog[]): PartialLog[] => {
  return evmLogs.map((log, index) => getPartialLog(log, index));
};

export interface PartialTransactionReceipt {
  to?: string;
  from: string;
  logs: PartialLog[];
  contractAddress?: string;
  root?: string;
  logsBloom: string;
  byzantium: boolean;
  type: number;
  gasUsed: BigNumber;
  cumulativeGasUsed: BigNumber;
  status?: number;
  exitReason?: string;
}

const DUMMY_LOGS_BLOOM =
  '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

export const getPartialTransactionReceipt = (event: FrameSystemEventRecord): PartialTransactionReceipt => {
  // @TODO
  const defaultValue = {
    logsBloom: DUMMY_LOGS_BLOOM,
    byzantium: false,
    // @TODO EIP712
    type: 0,
    cumulativeGasUsed: BIGNUMBER_ZERO
  };

  switch (event.event.method) {
    case 'Created': {
      const [source, evmAddress, logs, usedGas] = event.event.data as unknown as [H160, H160, EvmLog[], u64?, i32?];

      return {
        to: undefined,
        from: source.toHex(),
        contractAddress: evmAddress.toString(),
        gasUsed: BigNumber.from(usedGas?.toString() || 0),
        status: 1,
        logs: getPartialLogs(logs),
        ...defaultValue
      };
    }
    case 'Executed': {
      const [source, evmAddress, logs, usedGas] = event.event.data as unknown as [H160, H160, EvmLog[], u64?, i32?];

      return {
        to: evmAddress.toString(),
        from: source.toHex(),
        contractAddress: undefined,
        gasUsed: BigNumber.from(usedGas?.toString() || 0),
        logs: getPartialLogs(logs),
        status: 1,
        ...defaultValue
      };
    }
    case 'CreatedFailed': {
      const [source, evmAddress, _exitReason, logs, usedGas] = event.event.data as unknown as [
        H160,
        H160,
        ExitReason,
        EvmLog[],
        u64?,
        i32?
      ];

      return {
        to: undefined,
        from: source.toHex(),
        contractAddress: evmAddress.toString(),
        gasUsed: BigNumber.from(usedGas?.toString() || 0),
        logs: getPartialLogs(logs),
        status: 0,
        exitReason: _exitReason.toString(),
        ...defaultValue
      };
    }
    case 'ExecutedFailed': {
      const [source, evmAddress, _exitReason, , logs, usedGas] = event.event.data as unknown as [
        H160,
        H160,
        ExitReason,
        unknown,
        EvmLog[],
        u64?,
        i32?
      ];

      return {
        to: evmAddress.toString(),
        from: source.toHex(),
        contractAddress: undefined,
        gasUsed: BigNumber.from(usedGas?.toString() || 0),
        status: 0,
        exitReason: _exitReason.toString(),
        logs: getPartialLogs(logs),
        ...defaultValue
      };
    }
  }

  return logger.throwError(`unsupported event: ${event.event.method}`);
};

export const getEvmExtrinsicIndexes = (events: EventRecord[]): number[] => {
  return events
    .filter(
      (event) =>
        event.phase.isApplyExtrinsic &&
        event.event.section.toUpperCase() === 'EVM' &&
        ['Created', 'CreatedFailed', 'Executed', 'ExecutedFailed'].includes(event.event.method)
    )
    .reduce((r, event) => {
      const extrinsicIndex = event.phase.asApplyExtrinsic.toNumber();

      if (!r.length) {
        r = [extrinsicIndex];
      } else if (r[r.length - 1] !== extrinsicIndex) {
        r.push(extrinsicIndex);
      }

      return r;
    }, [] as number[]);
};

export const findEvmEvent = (events: EventRecord[]): EventRecord | undefined => {
  return events
    .filter(
      (event) =>
        event.event.section.toUpperCase() === 'EVM' &&
        ['Created', 'CreatedFailed', 'Executed', 'ExecutedFailed'].includes(event.event.method)
    )
    .reduce((r, event) => {
      // For the moment the case of multiple evm events in one transaction only support Executed
      if (r.event.method === 'Executed' && r.event.method === event.event.method) {
        const logs = event.event.data[2] as unknown as EvmLog[];
        const newLogs = (r.event.data[2] as unknown as EvmLog[]).concat(logs);

        r.event.data[2] = newLogs as any;
      }
      return r;
    });
};

export const getTransactionIndexAndHash = (
  hashOrNumber: string | number,
  extrinsics: GenericExtrinsic[],
  events: EventRecord[]
): {
  transactionIndex: number;
  transactionHash: string;
  isExtrinsicFailed: boolean;
  extrinsicIndex: number;
} => {
  const evmExtrinsicIndexes = getEvmExtrinsicIndexes(events);
  const extrinsicsHashes = extrinsics.map((extrinsic) => extrinsic.hash.toHex());

  let extrinsicIndex: number | undefined = undefined;

  if (isHexString(hashOrNumber, 32)) {
    extrinsicIndex = extrinsicsHashes.findIndex((hash) => hashOrNumber === hash);
  } else {
    const index = BigNumber.from(hashOrNumber).toNumber();
    extrinsicIndex = evmExtrinsicIndexes[index];
  }

  const transactionHash = extrinsicIndex ? extrinsics[extrinsicIndex]?.hash.toHex() : undefined;

  if (extrinsicIndex === undefined || transactionHash === undefined || extrinsicIndex < 0) {
    return logger.throwError(`transaction hash not found`, Logger.errors.UNKNOWN_ERROR, {
      hashOrNumber
    });
  }

  const transactionIndex = evmExtrinsicIndexes.findIndex((index) => index === extrinsicIndex);

  if (transactionIndex < 0) {
    return logger.throwError(`expected extrinsic include evm events`, Logger.errors.UNKNOWN_ERROR, {
      hashOrNumber
    });
  }

  const isExtrinsicFailed = events[events.length - 1].event.method === 'ExtrinsicFailed';

  return {
    transactionIndex,
    transactionHash,
    extrinsicIndex,
    isExtrinsicFailed
  };
};

// parse info that can be extracted from extrinsic alone
// only works for EVM extrinsics
export const parseExtrinsic = (
  extrinsic: GenericExtrinsic
): {
  value: string;
  gas: number;
  input: string;
  to: string | null;
  nonce: number;
  v: string;
  r: string;
  s: string;
} => {
  const nonce = extrinsic.nonce.toNumber();

  const NONE_EVM_TX_DEFAULT_DATA = {
    value: '0x0',
    gas: 2_100_000,
    input: '0x',
    to: null,
    nonce,
    ...DUMMY_V_R_S // TODO: get correct VRS
  };

  if (extrinsic.method.section.toUpperCase() !== 'EVM') {
    return NONE_EVM_TX_DEFAULT_DATA;
  }

  const args = (extrinsic.method.toJSON() as ExtrinsicMethodJSON).args;

  return {
    value: hexValue(args.value || 0),
    gas: args.gas_limit || 0,
    input: args.input || args.init || '0x',
    to: args.action?.call || args.target || null,
    nonce,
    ...DUMMY_V_R_S
  };
};

export const getEffectiveGasPrice = async (
  evmEvent: EventRecord,
  api: ApiPromise,
  blockHash: string,
  extrinsic: GenericExtrinsic<AnyTuple>,
  actualWeight: number
): Promise<BigNumber> => {
  const { data: eventData, method: eventMethod } = evmEvent.event;

  const gasInfoExists =
    eventData.length > 5 || (eventData.length === 5 && ['Created', 'Executed'].includes(eventMethod));

  if (!gasInfoExists) return BIGNUMBER_ONE;

  const usedGas = BigNumber.from(eventData[eventData.length - 2].toString());
  const usedStorage = BigNumber.from(eventData[eventData.length - 1].toString());

  const block = await api.rpc.chain.getBlock(blockHash);

  // use parentHash to get tx fee
  const parentHash = block.block.header.parentHash;
  const { weight: estimatedWeight } = await api.rpc.payment.queryInfo(extrinsic.toHex(), parentHash);
  const { inclusionFee } = await api.rpc.payment.queryFeeDetails(extrinsic.toHex(), parentHash);
  const { baseFee, lenFee, adjustedWeightFee } = inclusionFee.unwrap();

  const weightFee = (adjustedWeightFee.toBigInt() * BigInt(actualWeight)) / estimatedWeight.toBigInt();
  let txFee = BigNumber.from(baseFee.toBigInt() + lenFee.toBigInt() + weightFee);

  txFee = nativeToEthDecimal(txFee, 12);

  // if usedStorage > 0, txFee include the storage fee.
  if (usedStorage.gt(0)) {
    const storageFee = usedStorage.mul(api.consts.evm.storageDepositPerByte.toBigInt());
    txFee = txFee.add(storageFee);
  }

  return txFee.div(usedGas);
};

export const getVirtualTxReceiptsFromEvents = (
  events: Vec<FrameSystemEventRecord>,
  blockHash: string,
  blockNumber: number
): TransactionReceipt[] => {
  const receipts = events
    .filter(isOrphanEvmEvent)
    .map(getPartialTransactionReceipt)
    .map((partialReceipt, i) => {
      const transactionHash = keccak256([...hexToU8a(blockHash), ...nToU8a(i)]);
      const txInfo = {
        transactionIndex: 0,
        transactionHash,
        blockHash,
        blockNumber
      };

      const logs = partialReceipt.logs.map((log) => ({
        ...log,
        ...txInfo
      }));

      return {
        ...partialReceipt,
        ...txInfo,
        logs
      };
    });

  const formatter = new Formatter();
  return receipts.map(formatter.receipt.bind(formatter));
};
