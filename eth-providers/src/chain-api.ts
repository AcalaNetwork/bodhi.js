import {
  rpc as acalaRpc,
  signedExtensions as acalaSignedExtensions,
  types as acalaTypes,
  typesAlias as acalaTypesAlias,
  typesBundle as acalaTypesBundle
} from '@acala-network/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { ApiOptions } from '@polkadot/api/types';

const TYPES = {
  AtLeast64BitUnsigned: 'u128',
  EvmAccountInfo: {
    nonce: 'Index',
    contractInfo: 'Option<EvmContractInfo>',
    developerDeposit: 'Option<Balance>'
  },
  EvmContractInfo: {
    codeHash: 'H256',
    maintainer: 'H160',
    deployed: 'bool'
  },
  TransactionAction: {
    _enum: {
      Call: 'H160',
      Create: 'Null'
    }
  },
  MultiSignature: {
    _enum: {
      Ed25519: 'Ed25519Signature',
      Sr25519: 'Sr25519Signature',
      Ecdsa: 'EcdsaSignature',
      Ethereum: '[u8; 65]',
      Eip712: '[u8; 65]'
    }
  }
};

export const defaultOptions: ApiOptions = {
  types: acalaTypes,
  rpc: acalaRpc
};

export const createApiOptions = ({
  types = {},
  rpc = {},
  typesAlias = {},
  typesBundle = {},
  signedExtensions,
  ...otherOptions
}: ApiOptions = {}): ApiOptions => ({
  types: {
    ...types
  },
  rpc: {
    ...acalaRpc,
    ...rpc
  },
  typesAlias: {
    ...acalaTypesAlias,
    ...typesAlias
  },
  typesBundle: {
    ...typesBundle,
    spec: {
      ...typesBundle.spec,
      acala: {
        ...acalaTypesBundle?.spec?.acala,
        ...typesBundle?.spec?.acala
      },
      mandala: {
        ...acalaTypesBundle?.spec?.mandala,
        ...typesBundle?.spec?.mandala
      },
      karura: {
        ...acalaTypesBundle?.spec?.karura,
        ...typesBundle?.spec?.mandala
      }
    }
  },
  signedExtensions: {
    ...acalaSignedExtensions,
    ...signedExtensions
  },
  ...otherOptions
});

export const createApi = (endpoints: string | string[], apiOptions?: ApiOptions): ApiPromise => {
  const wsProvider = new WsProvider(endpoints);

  return new ApiPromise(
    createApiOptions({
      types: {
        ...TYPES,
        ...apiOptions?.types
      },
      provider: wsProvider,
      ...apiOptions
    })
  );
};
