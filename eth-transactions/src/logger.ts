import { Logger } from '@ethersproject/logger';
import { version } from './_version';

export const logger = new Logger(version);
