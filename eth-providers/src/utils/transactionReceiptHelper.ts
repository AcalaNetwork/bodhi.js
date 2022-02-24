import { BigNumber } from '@ethersproject/bignumber';
import { isHexString } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import type { GenericExtrinsic } from '@polkadot/types';
import type { EventRecord } from '@polkadot/types/interfaces';
import type { EvmLog, H160 } from '@polkadot/types/interfaces/types';
import type { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { BIGNUMBER_ZERO, EFFECTIVE_GAS_PRICE } from '../consts';
import { logger } from './logger';

export interface PartialLog {
  removed: boolean;
  address: string;
  data: string;
  topics: string[];
  logIndex: number;
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
  type: number;
  gasUsed: BigNumber;
  cumulativeGasUsed: BigNumber;
  effectiveGasPrice: BigNumber;
  status?: number;
}

const DUMMY_LOGS_BLOOM =
  '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

export const getPartialTransactionReceipt = (event: FrameSystemEventRecord): PartialTransactionReceipt => {
  // @TODO
  const defaultValue = {
    logsBloom: DUMMY_LOGS_BLOOM,
    // @TODO EIP712
    type: 0,
    gasUsed: BIGNUMBER_ZERO,
    cumulativeGasUsed: BIGNUMBER_ZERO,
    effectiveGasPrice: EFFECTIVE_GAS_PRICE
  };

  switch (event.event.method) {
    case 'Created': {
      const [source, evmAddress, logs] = event.event.data as unknown as [H160, H160, EvmLog[]];

      return {
        to: undefined,
        from: source.toHex(),
        contractAddress: evmAddress.toString(),
        status: 1,
        logs: getPartialLogs(logs),
        ...defaultValue
      };
    }
    case 'Executed': {
      const [source, evmAddress, logs] = event.event.data as unknown as [H160, H160, EvmLog[]];

      return {
        to: evmAddress.toString(),
        from: source.toHex(),
        contractAddress: evmAddress.toString(),
        logs: getPartialLogs(logs),
        status: 1,
        ...defaultValue
      };
    }
    case 'CreatedFailed': {
      const [source, evmAddress, _exitReason, logs] = event.event.data as unknown as [H160, H160, unknown, EvmLog[]];

      return {
        to: undefined,
        from: source.toHex(),
        contractAddress: evmAddress.toString(),
        logs: getPartialLogs(logs),
        status: 0,
        ...defaultValue
      };
    }
    case 'ExecutedFailed': {
      const [source, evmAddress, _exitReason, _output, logs] = event.event.data as unknown as [
        H160,
        H160,
        unknown,
        unknown,
        EvmLog[]
      ];

      return {
        to: evmAddress.toString(),
        from: source.toHex(),
        contractAddress: undefined,
        status: 0,
        logs: getPartialLogs(logs),
        ...defaultValue
      };
    }
  }

  return logger.throwError(`unsupported event: ${event.event.method}`);
};

type ExtrinsicWithIndex = {
  extrinsic: GenericExtrinsic;
  extrinsicIndex: number;
};

export const getEvmExtrinsicIndexes = (events: EventRecord[]) => {
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

export const findEvmEvent = (events: EventRecord[]) => {
  // For the moment the case of multiple evm events in one transaction is ignored
  return events.find(({ event }) => {
    return (
      event.section.toUpperCase() === 'EVM' &&
      ['Created', 'CreatedFailed', 'Executed', 'ExecutedFailed'].includes(event.method)
    );
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
