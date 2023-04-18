import { createTransactionPayload } from '../createTransactionPayload';
import { describe, expect, it } from 'vitest';
import { signTransaction } from '../signTransaction';
import { transactionHash } from '../transactionHash';
import { verifyTypedData } from '@ethersproject/wallet';

const value = {
  chainId: 595,
  nonce: 0,
  salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
  gasLimit: 2100000,
  to: undefined,
  value: 0,
  data: '0xcfae3217',
  type: 96,
  accessList: [],
};

const privateKey = '0x4daddf7d5d2a9059e8065cb3ec50beabe2c23c7d6b3e380c1de8c40269acd85c';
const address = '0xb00cB924ae22b2BBb15E10c17258D6a2af980421';

describe('SignTypedData', () => {
  it('test signature', async () => {
    const payload = createTransactionPayload(value);

    const _ethersHash = transactionHash(value);
    const ethersSig = signTransaction(privateKey, value);

    expect(
      verifyTypedData(
        payload.domain,
        {
          AccessList: payload.types.AccessList,
          Transaction: payload.types.Transaction,
        },
        payload.message,
        ethersSig
      )
    ).equal(address);

    // console.log(ethersHash);
    // console.log(ethersSig);

    // const metamaskPayload = {
    //   ...payload,
    //   domain: {
    //     ...payload.domain,
    //     salt: Buffer.from(arrayify(payload.domain.salt))
    //   }
    // };

    // const metamaskHash = TypedDataUtils.eip712Hash(metamaskPayload, SignTypedDataVersion.V4);

    // const metamaskSig = signTypedData({
    //   privateKey: Buffer.from(arrayify(privateKey)),
    //   data: metamaskPayload,
    //   version: SignTypedDataVersion.V4
    // });

    // console.log(metamaskSig);

    // expect(ethersHash).equal('0x' + metamaskHash.toString('hex'));
    // expect(ethersSig).equal(metamaskSig);

    // expect(
    //   getAddress(
    //     recoverTypedSignature({
    //       data: metamaskPayload,
    //       signature: metamaskSig,
    //       version: SignTypedDataVersion.V4
    //     })
    //   )
    // ).equal(address);
  });
});
