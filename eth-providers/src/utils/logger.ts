import { Logger } from '@ethersproject/logger';
import { version } from '../_version';

export const logger = new Logger(version);

export enum PROVIDER_ERRORS {
  // When the specified block height or hash is not found
  HEADER_NOT_FOUND = 'HEADER_NOT_FOUND'
}

export const throwNotImplemented = (method: string): never => {
  return logger.throwError(`${method} not implemented`, Logger.errors.NOT_IMPLEMENTED, {
    method,
    provider: 'eth-providers'
  });
};
