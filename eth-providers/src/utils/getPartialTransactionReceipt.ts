import type { EvmLog, H160 } from '@polkadot/types/interfaces/types';
import type { FrameSystemEventRecord } from '@polkadot/types/lookup';
import { BigNumber } from 'ethers';
import { BIGNUMBER_ZERO, EFFECTIVE_GAS_PRICE } from '../consts';
import { getPartialLogs, PartialLog } from './getPartialLogs';
import { logger } from './logger';

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
}

export const getPartialTransactionReceipt = (event: FrameSystemEventRecord): PartialTransactionReceipt => {
  // @TODO
  const defaultValue = {
    logsBloom: '0x',
    byzantium: false,
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
