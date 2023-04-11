import { BigNumber } from '@ethersproject/bignumber';
import { hexValue, isHexString } from '@ethersproject/bytes';

export const hexlifyRpcResult = (data: unknown): any => {
  if (data === null || data === undefined) return data;
  if (typeof data === 'boolean') return data;

  if (BigNumber.isBigNumber(data)) {
    return hexValue(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => {
      return hexlifyRpcResult(item);
    });
  }

  if (data && typeof data === 'object') {
    const keys = Object.keys(data);
    const result: any = {};

    for (const key of keys) {
      result[key] = hexlifyRpcResult((data as any)[key]);
    }

    return result;
  }

  if (typeof data === 'number') {
    return hexValue(data as any);
  }

  if (isHexString(data)) {
    return (data as string).toLowerCase();
  }

  return data;
};
