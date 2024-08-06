import { ApiPromise } from '@polkadot/api';
import { Extrinsic } from '@polkadot/types/interfaces';
import { HexString } from '@polkadot/util/types';
import { IExtrinsic } from '@polkadot/types/types';

import { opName } from '../consts';

export type CallTrace = {
  type: 'CALL' | 'CALLCODE' | 'STATICCALL' | 'DELEGATECALL' | 'CREATE' | 'SUICIDE';
  from: HexString;
  to: HexString;
  input: HexString;
  value: HexString;
  gas: number;
  gasUsed: number;
  output: HexString | null;
  error: string | null;
  revertReason: string | null;
  depth: number;
  calls: CallTrace[];
}

export interface StepBase {
  pc: number;
  depth: number;
  gas: number;
  stack: HexString[];
  memory: string[] | null;
}

export interface StepRaw extends StepBase {
  op: number;
}

export interface Step extends StepBase {
  op: string;
}

export enum TracerType {
  CallTracer = 'callTracer',
  OpcodeTracer = 'opcodeTracer'
}

export const traceVM = async (
  api: ApiPromise,
  extrinsic: Extrinsic | IExtrinsic | string | Uint8Array,
): Promise<Step[]> => {
  if (!api.call.evmTraceApi) {
    throw new Error('traceCall: EVM tracing is not supported by the node');
  }

  const pageSize = 10000;
  const traceConf = {
    page: 0,
    pageSize,
    disableStack: false,
    enableMemory: true,
  };

  let traceNextPage = true;
  let steps: Step[] = [];
  while (traceNextPage) {
    const res = await api.call.evmTraceApi.traceExtrinsic(extrinsic, { OpcodeTracer: traceConf });

    if (!res.isOk) {
      throw new Error(`traceVM: trace failed. Err: ${res.asErr.toString()}`);
    }

    const okRes = res.asOk;
    if (!okRes.isSteps) {
      throw new Error('traceVM: invalid outcome');
    }

    const curSteps = okRes.asSteps.toJSON() as unknown as StepRaw[];

    steps = steps.concat(
      curSteps.map(step => ({
        ...step,
        op: opName(step.op),
        // transform memory to 64 bytes chunks
        memory: step.memory
          ? step.memory.map((chunk, idx) => {
            // remove 0x prefix
            const slice = chunk.slice(2);
            // make sure each chunk is 64 bytes
            return slice.length < 64 && idx + 1 < step.memory!.length
              ? slice.padStart(64, '0')
              : slice;
          })
          : null,
      })),
    );

    traceConf.page++;
    traceNextPage = curSteps.length == pageSize;
  }

  return steps;
};

export const traceCall = async (
  api: ApiPromise,
  extrinsic: Extrinsic | IExtrinsic | string | Uint8Array,
): Promise<CallTrace[]> => {
  if (!api.call.evmTraceApi) {
    throw new Error('traceCall: EVM tracing is not supported by the node');
  }

  const traceConf = { CallTracer: null };
  const res = await api.call.evmTraceApi.traceExtrinsic(extrinsic, traceConf);
  if (!res.isOk) {
    throw new Error(`traceCall: trace failed. Err: ${res.asErr.toString()}`);
  }

  const okRes = res.asOk;
  if (!okRes.isCalls) {
    throw new Error('traceVM: invalid outcome');
  }

  return okRes.asCalls.toJSON() as CallTrace[];
};
