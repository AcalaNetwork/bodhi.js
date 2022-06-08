import { BigNumber } from '@ethersproject/bignumber';
import { hexValue, isHexString } from '@ethersproject/bytes';
import { Logger } from '@ethersproject/logger';
import { ApiPromise } from '@polkadot/api';
import type { GenericExtrinsic, i32, u64 } from '@polkadot/types';
import type { EventRecord } from '@polkadot/types/interfaces';
import type { EvmLog, H160, ExitReason } from '@polkadot/types/interfaces/types';
import type { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { BIGNUMBER_ZERO, EFFECTIVE_GAS_PRICE, BIGNUMBER_ONE, DUMMY_V, DUMMY_R, DUMMY_S } from '../consts';
import { logger } from './logger';
import { nativeToEthDecimal } from './utils';
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
  byzantium: boolean;
  type: number;
  gasUsed: BigNumber;
  cumulativeGasUsed: BigNumber;
  effectiveGasPrice: BigNumber;
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
    cumulativeGasUsed: BIGNUMBER_ZERO,
    effectiveGasPrice: EFFECTIVE_GAS_PRICE
  };

  switch (event.event.method) {
    case 'Created': {
      const [source, evmAddress, logs, used_gas, _used_storage] = event.event.data as unknown as [
        H160,
        H160,
        EvmLog[],
        u64?,
        i32?
      ];

      return {
        to: undefined,
        from: source.toHex(),
        contractAddress: evmAddress.toString(),
        gasUsed: BigNumber.from(used_gas?.toString() || 0),
        status: 1,
        logs: getPartialLogs(logs),
        ...defaultValue
      };
    }
    case 'Executed': {
      const [source, evmAddress, logs, used_gas, _used_storage] = event.event.data as unknown as [
        H160,
        H160,
        EvmLog[],
        u64?,
        i32?
      ];

      return {
        to: evmAddress.toString(),
        from: source.toHex(),
        contractAddress: undefined,
        gasUsed: BigNumber.from(used_gas?.toString() || 0),
        logs: getPartialLogs(logs),
        status: 1,
        ...defaultValue
      };
    }
    case 'CreatedFailed': {
      const [source, evmAddress, _exitReason, logs, used_gas, _used_storage] = event.event.data as unknown as [
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
        gasUsed: BigNumber.from(used_gas?.toString() || 0),
        logs: getPartialLogs(logs),
        status: 0,
        exitReason: _exitReason.toString(),
        ...defaultValue
      };
    }
    case 'ExecutedFailed': {
      const [source, evmAddress, _exitReason, _output, logs, used_gas, _used_storage] = event.event.data as unknown as [
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
        gasUsed: BigNumber.from(used_gas?.toString() || 0),
        status: 0,
        exitReason: _exitReason.toString(),
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

export interface ExtrinsicParsedData {
  gasPrice: BigNumber;
  gas: number;
  input: string;
  v: string;
  r: string;
  s: string;
  hash: string;
  nonce: number;
  from: string;
  to: string | null;
  value: string;
}

export const parseExtrinsic = async (
  blockHash: string,
  extrinsic: GenericExtrinsic,
  extrinsicEvents: EventRecord[],
  api: ApiPromise
): Promise<ExtrinsicParsedData> => {
  // logger.info(extrinsic.method.toHuman());
  // logger.info(extrinsic.method);

  const evmEvent = findEvmEvent(extrinsicEvents);
  if (!evmEvent) {
    return logger.throwError(
      'findEvmEvent failed. extrinsic: ' + extrinsic.method.toJSON(),
      Logger.errors.UNSUPPORTED_OPERATION
    );
  }

  const { data: eventData, method: eventMethod } = evmEvent.event;

  let gas: number;
  let value: number;
  let input: string;
  let gasPrice = BIGNUMBER_ONE;

  const from = eventData[0].toString();
  const to = ['Created', 'CreatedFailed'].includes(eventMethod) ? null : eventData[1].toString();

  const gasInfoExists =
    eventData.length > 5 || (eventData.length === 5 && ['Created', 'Executed'].includes(eventMethod));

  if (gasInfoExists) {
    const used_gas = BigNumber.from(eventData[eventData.length - 2].toString());
    const used_storage = BigNumber.from(eventData[eventData.length - 1].toString());

    const block = await api.rpc.chain.getBlock(blockHash);
    // use parentHash to get tx fee
    const payment = await api.rpc.payment.queryInfo(extrinsic.toHex(), block.block.header.parentHash);
    // ACA/KAR decimal is 12. Mul 10^6 to make it 18.
    let tx_fee = nativeToEthDecimal(payment.partialFee.toString(), 12);

    // get storage fee
    // if used_storage > 0, tx_fee include the storage fee.
    if (used_storage.gt(0)) {
      tx_fee = tx_fee.add(used_storage.mul(api.consts.evm.storageDepositPerByte.toBigInt()));
    }

    gasPrice = tx_fee.div(used_gas);
  }

  switch (extrinsic.method.section.toUpperCase()) {
    case 'EVM': {
      const evmExtrinsic: any = extrinsic.method.toJSON();
      value = evmExtrinsic?.args?.value;
      gas = evmExtrinsic?.args?.gas_limit;
      // @TODO remove
      // only work on mandala and karura-testnet
      // https://github.com/AcalaNetwork/Acala/pull/1965
      input = evmExtrinsic?.args?.input || evmExtrinsic?.args?.init;
      break;
    }
    // Not a raw evm transaction, input = 0x
    // case 'CURRENCIES':
    // case 'DEX':
    // case 'HONZONBRIDGE':
    // case 'PROXY':
    // case 'SUDO':
    // case 'TECHNICALCOMMITTEE':
    // case 'STABLEASSET':
    // @TODO support utility
    // case 'UTILITY': {
    //   return logger.throwError('Unspport utility, blockHash: ' + blockHash, Logger.errors.UNSUPPORTED_OPERATION);
    // }
    // default: {
    //   return logger.throwError(
    //     'Unspport ' + extrinsic.method.section.toUpperCase() + ' blockHash: ' + blockHash,
    //     Logger.errors.UNSUPPORTED_OPERATION
    //   );
    // }

    // Not a raw evm transaction, input = 0x
    default: {
      value = 0;
      gas = 2_100_000;
      input = '0x';
    }
  }

  // @TODO eip2930, eip1559

  // @TODO Missing data
  return {
    gasPrice,
    gas,
    input,
    v: DUMMY_V,
    r: DUMMY_R,
    s: DUMMY_S,
    hash: extrinsic.hash.toHex(),
    nonce: extrinsic.nonce.toNumber(),
    from: from,
    to: to,
    value: hexValue(value)
  };
};
