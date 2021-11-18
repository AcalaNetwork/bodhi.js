import { arrayify } from '@ethersproject/bytes';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { verifyTypedData, Wallet } from '@ethersproject/wallet';
import { recoverTypedSignature, signTypedData, SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';
import { expect } from 'chai';
import { getAddress } from '@ethersproject/address';

const domain = {
  name: 'Acala EVM',
  version: '1',
  chainId: 0,
  salt: '0x0000000000000000000000000000000000000000000000000000000000000000'
};

const types = {
  Transaction: [
    { name: 'action', type: 'string' },
    { name: 'to', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'tip', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'value', type: 'uint256' },
    { name: 'gasLimit', type: 'uint256' },
    { name: 'storageLimit', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' }
  ]
};

const value = {
  action: 'Create',
  to: '0x0000000000000000000000000000000000000000',
  nonce: 0,
  tip: 2,
  data: '0xcfae3217',
  value: '0',
  gasLimit: 2100000,
  storageLimit: 20000,
  validUntil: 111000
};

const data = {
  types: {
    EIP712Domain: [
      {
        name: 'name',
        type: 'string'
      },
      {
        name: 'version',
        type: 'string'
      },
      {
        name: 'chainId',
        type: 'uint256'
      },
      {
        name: 'salt',
        type: 'bytes32'
      }
    ],
    Transaction: types.Transaction
  },
  primaryType: 'Transaction' as const,
  domain: {
    ...domain,
    salt: Buffer.from(arrayify(domain.salt))
  },
  message: value
};

const privateKey = '0x4daddf7d5d2a9059e8065cb3ec50beabe2c23c7d6b3e380c1de8c40269acd85c';
const address = '0xb00cB924ae22b2BBb15E10c17258D6a2af980421';
const wallet = new Wallet(privateKey);

describe('SignTypedData', () => {
  it('test signature', async () => {
    const ethersSig = await wallet._signTypedData(domain, types, value);

    const ethersHash = _TypedDataEncoder.hash(domain, types, value);

    expect(verifyTypedData(domain, types, value, ethersSig)).equal(address);

    const metamaskHash = TypedDataUtils.eip712Hash(data, SignTypedDataVersion.V4);
    const metamaskSig = signTypedData({
      privateKey: Buffer.from(arrayify(privateKey)),
      data,
      version: SignTypedDataVersion.V4
    });

    expect(ethersHash).equal('0x' + metamaskHash.toString('hex'));
    expect(ethersSig).equal(metamaskSig);

    console.log(metamaskSig);
    expect(
      getAddress(
        recoverTypedSignature({
          data,
          signature: metamaskSig,
          version: SignTypedDataVersion.V4
        })
      )
    ).equal(address);
  });
});
