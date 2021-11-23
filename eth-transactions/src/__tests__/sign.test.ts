import { arrayify } from '@ethersproject/bytes';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { verifyTypedData, Wallet } from '@ethersproject/wallet';
import { recoverTypedSignature, signTypedData, SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';
import { expect } from 'chai';
import { getAddress } from '@ethersproject/address';
import { createTransactionPayload } from '../createTransactionPayload';
import { signTransaction } from '../signTransaction';
import { transactionHash } from '../transactionHash';

const value = {
  chainId: 0,
  nonce: 0,
  data: '0xcfae3217',
  value: '0',
  gasLimit: 2100000
};

const privateKey = '0x4daddf7d5d2a9059e8065cb3ec50beabe2c23c7d6b3e380c1de8c40269acd85c';
const address = '0xb00cB924ae22b2BBb15E10c17258D6a2af980421';
const wallet = new Wallet(privateKey);

describe('SignTypedData', () => {
  it('test signature', async () => {
    const payload = createTransactionPayload(value);

    const ethersHash = transactionHash(value);
    const ethersSig = signTransaction(privateKey, value);

    expect(
      verifyTypedData(
        payload.domain,
        {
          Transaction: payload.types.Transaction
        },
        payload.message,
        ethersSig
      )
    ).equal(address);

    const metamaskPayload = {
      ...payload,
      domain: {
        ...payload.domain,
        salt: Buffer.from(arrayify(payload.domain.salt))
      }
    };

    // @ts-ignore
    const metamaskHash = TypedDataUtils.eip712Hash(metamaskPayload, SignTypedDataVersion.V4);

    const metamaskSig = signTypedData({
      privateKey: Buffer.from(arrayify(privateKey)),
      data: metamaskPayload,
      version: SignTypedDataVersion.V4
    });

    console.log(metamaskSig);

    expect(ethersHash).equal('0x' + metamaskHash.toString('hex'));
    expect(ethersSig).equal(metamaskSig);

    expect(
      getAddress(
        recoverTypedSignature({
          data: metamaskPayload,
          signature: metamaskSig,
          version: SignTypedDataVersion.V4
        })
      )
    ).equal(address);
  });
});
