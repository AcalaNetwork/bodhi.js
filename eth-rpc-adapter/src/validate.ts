import { InvalidParams } from './errors';

export type Schema = {
  type: 'address' | 'block' | 'transaction' | 'blockHash' | 'flag' | 'position' | 'transactionData' | 'object';
}[];

export const validateHexNumber = (value: string) => {
  validateHexString(value);
  if (value.length > 18) {
    throw new Error('hex number > 64 bits');
  }
};

export const validateAddress = (data: any) => {
  if (typeof data !== 'string') {
    throw new Error(`invalid evm address, expected type String`);
  }

  validateHexString(data, 40);
};

export const validateBlock = (data: any) => {
  if (typeof data !== 'string') {
    throw new Error(`invalid block tag, expected type String`);
  }

  if (!['latest', 'earliest', 'pending'].includes(data)) {
    validateHexNumber(data);
  }
};

export const validateTransaction = (data: any) => {
  // @TODO
};

export const validateBlockHash = (data: any) => {
  if (typeof data !== 'string') {
    throw new Error(`invalid block hash, expected type String`);
  }

  validateHexString(data, 64);
};

export const validateFlag = (data: any) => {
  if (typeof data !== 'boolean') {
    throw new Error(`expect a bool value`);
  }
};

export const validatePosition = (data: any) => {
  if (typeof data !== 'string') {
    throw new Error(`invalid position, expected type String`);
  }
};

export const validateTransactionData = (data: any) => {
  if (typeof data !== 'string') {
    throw new Error(`invalid transaction data, expected type String`);
  }
};

export const validateObject = (data: any) => {
  if (data.constructor !== Object) {
    throw new Error(`invalid args, expected Object`);
  }
};

export const validate = (schema: Schema, data: unknown[]) => {
  const maxArg = schema.length;

  if (data.length > maxArg) {
    throw new InvalidParams(`too many arguments, want at most ${maxArg}`);
  }

  for (let i = 0; i < schema.length; i++) {
    if (data[i] === undefined) {
      throw new InvalidParams(`missing value for required argument ${i}`);
    }

    try {
      switch (schema[i].type) {
        case 'address': {
          validateAddress(data[i]);
          break;
        }
        case 'block': {
          validateBlock(data[i]);
          break;
        }
        case 'transaction': {
          validateTransaction(data[i]);
          break;
        }
        case 'blockHash': {
          validateBlockHash(data[i]);
          break;
        }
        case 'flag': {
          validateFlag(data[i]);
          break;
        }
        case 'position': {
          validatePosition(data[i]);
          break;
        }
        case 'transactionData': {
          validateTransactionData(data[i]);
          break;
        }
        case 'object': {
          validateObject(data[i]);
          break;
        }
        default:
          break;
      }
    } catch (err: any) {
      throw new InvalidParams(`invalid argument ${i}: ${err?.message}`);
    }
  }
};

export function validateHexString(value: string, length?: number): void {
  if (typeof value !== 'string') {
    throw new Error('expect a hex string');
  }
  value = value.toLowerCase();

  if (value.indexOf('0x')) {
    throw new Error('hex string without 0x prefix');
  }

  if (value === '0x') {
    throw new Error('hex string "0x"');
  }

  if (!value.match(/^0x[0-9A-Fa-f]*$/)) {
    throw new Error('invalid hex string');
  }

  if (length && value.length !== 2 + length) {
    throw new Error(`hex string has length ${value.length - 2} but want ${length}`);
  }
}
