import { Logger } from '@ethersproject/logger';
import { version } from '../_version';

export const logger = new Logger(version);

export const throwNotImplemented = (method: string): never => {
  return logger.throwError(`${method} not implemented`, Logger.errors.NOT_IMPLEMENTED, {
    method,
    provider: 'eth-providers'
  });
};
