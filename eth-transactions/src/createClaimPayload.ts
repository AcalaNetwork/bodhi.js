import { hexlify } from '@ethersproject/bytes';
import { decodeAddress } from '@polkadot/util-crypto';
import { logger } from './logger';
import { ClaimPayload } from './types';

// eslint-disable-next-line
export const createClaimPayload = (tx: ClaimPayload) => {
  if (!tx.salt) {
    return logger.throwError('claim payload missing salt');
  }

  if (!tx.chainId) {
    return logger.throwError('claim payload missing chainId');
  }

  if (!tx.substrateAddress) {
    return logger.throwError('claim payload missing substrateAddress');
  }

  let publicKey: Uint8Array;

  try {
    publicKey = decodeAddress(tx.substrateAddress);
  } catch {
    return logger.throwError('invalid substrateAddress');
  }

  return {
    types: {
      EIP712Domain: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'salt',
          type: 'bytes32',
        },
      ],
      Transaction: [{ name: 'substrateAddress', type: 'bytes' }],
    },
    primaryType: 'Transaction' as const,
    domain: {
      name: 'Acala EVM claim',
      version: '1',
      chainId: tx.chainId,
      salt: hexlify(tx.salt),
    },
    message: {
      substrateAddress: hexlify(publicKey),
    },
  };
};
