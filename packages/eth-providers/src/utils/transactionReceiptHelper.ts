import { BIGNUMBER_ZERO, DUMMY_V_R_S, ORPHAN_TX_DEFAULT_INFO } from '../consts';
import { BigNumber } from '@ethersproject/bignumber';
import { Formatter, TransactionReceipt } from '@ethersproject/providers';
import { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { TX } from '../base-provider';
import { TransactionReceipt as TransactionReceiptSubql } from './gqlTypes';
import { hexToU8a, nToU8a } from '@polkadot/util';
import { hexValue } from '@ethersproject/bytes';
import { isOrphanEvmEvent } from './utils';
import { keccak256 } from '@ethersproject/keccak256';
import { logger } from './logger';
import type { EventRecord, SignedBlock } from '@polkadot/types/interfaces';
import type { EvmLog, ExitReason, H160 } from '@polkadot/types/interfaces/types';
import type { GenericExtrinsic, i32, u64 } from '@polkadot/types';

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

export interface FullReceipt extends TransactionReceipt {
  exitReason?: string;
}

export const getPartialLog = (evmLog: EvmLog, logIndex: number): PartialLog => {
  return {
    removed: false,
    address: evmLog.address.toString().toLowerCase(),
    data: evmLog.data.toString().toLowerCase(),
    topics: evmLog.topics.toJSON() as any,
    logIndex: logIndex,
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
  status?: number;
  exitReason?: string;
}

const DUMMY_LOGS_BLOOM =
  '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

export const getPartialTransactionReceipt = (event: FrameSystemEventRecord): PartialTransactionReceipt => {
  // @TODO
  const defaultValue = {
    logsBloom: DUMMY_LOGS_BLOOM,
    // @TODO EIP712
    type: 0,
    cumulativeGasUsed: BIGNUMBER_ZERO,
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
        ...defaultValue,
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
        ...defaultValue,
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
        ...defaultValue,
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
        ...defaultValue,
      };
    }
  }

  return logger.throwError(`unsupported event: ${event.event.method}`);
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
    ...DUMMY_V_R_S, // TODO: get correct VRS
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
    ...DUMMY_V_R_S,
  };
};

// a simulation of nToU8a from @polkadot/api@8
const nToU8aLegacy = (...params: Parameters<typeof nToU8a>): ReturnType<typeof nToU8a> => {
  return params[0] === 0 ? new Uint8Array() : nToU8a(...params);
};

export const formatter = new Formatter();
export const fullReceiptFormatter = {
  ...formatter.formats.receipt,
  exitReason: (x: any) => x,
};

export const getOrphanTxReceiptsFromEvents = (
  events: FrameSystemEventRecord[],
  blockHash: string,
  blockNumber: number,
  indexOffset: number
): FullReceipt[] => {
  const receipts = events
    .filter(isOrphanEvmEvent)
    .map(getPartialTransactionReceipt)
    .map((partialReceipt, i) => {
      const transactionHash = keccak256([...hexToU8a(blockHash), ...nToU8aLegacy(i)]);
      const txInfo = {
        transactionIndex: indexOffset + i,
        transactionHash,
        blockHash,
        blockNumber,
      };

      const logs = partialReceipt.logs.map((log) => ({
        ...log,
        ...txInfo,
      }));

      return {
        effectiveGasPrice: BIGNUMBER_ZERO,
        ...partialReceipt,
        ...txInfo,
        logs,
      };
    });

  return receipts.map((receipt) => Formatter.check(fullReceiptFormatter, receipt));
};

export const subqlReceiptAdapter = <T extends TransactionReceiptSubql | null>(
  receipt: T
): T extends null ? null : TransactionReceipt =>
    receipt
      ? Formatter.check(fullReceiptFormatter, {
        ...receipt,
        logs: receipt.logs.nodes,
      })
      : null;

export const receiptToTransaction = (tx: FullReceipt, block: SignedBlock): TX => {
  const extrinsic = block.block.extrinsics.find((ex) => ex.hash.toHex() === tx.transactionHash);

  const extraData = extrinsic ? parseExtrinsic(extrinsic) : ORPHAN_TX_DEFAULT_INFO;

  return {
    blockHash: tx.blockHash,
    blockNumber: tx.blockNumber,
    transactionIndex: tx.transactionIndex,
    hash: tx.transactionHash,
    from: tx.from,
    gasPrice: tx.effectiveGasPrice,
    ...extraData,

    // overrides `to` in parseExtrinsic, in case of non-evm extrinsic, such as dex.xxx
    to: tx.to || null,
  };
};
