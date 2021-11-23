import { joinSignature } from '@ethersproject/bytes';
import { expect } from 'chai';
import { parseTransaction } from '../parseTransaction';
import { serializeTransaction } from '../serializeTransaction';

const sig =
  '0xd8c6ff1a8b4fbdd8b9c4fe640933e8f61002de0ed0ef64989cc6e9168941dc677e4f06493616c4c45a7cb9b99c1a3a4281a6d088d7ebe19d4c2f823103726af81c';

const data = {
  chainId: 0,
  nonce: 0,
  gasLimit: 2100000,
  to: undefined,
  value: 0,
  data: '0xcfae3217',
  type: 96
};

//[chainId, nonce, gasLimit, to, value, data, eip712sig]
describe('transaction', () => {
  it('serializeTransaction signed', async () => {
    const tx = serializeTransaction(data, sig);

    const parsedTx = parseTransaction(tx);

    expect(data).deep.equal({
      chainId: parsedTx.chainId,
      nonce: parsedTx.nonce,
      gasLimit: parsedTx.gasLimit.toNumber(),
      to: parsedTx.chainId || undefined,
      value: parsedTx.value.toNumber(),
      data: parsedTx.data,
      type: parsedTx.type
    });

    console.log(parsedTx.from);

    const parsedSig = joinSignature({ r: parsedTx.r!, s: parsedTx.s, v: parsedTx.v });

    expect(parsedSig).equal(sig);
  });

  it('serializeTransaction unsigned', async () => {
    const tx = serializeTransaction(data);

    const parsedTx = parseTransaction(tx);

    expect(data).deep.equal({
      chainId: parsedTx.chainId,
      nonce: parsedTx.nonce,
      gasLimit: parsedTx.gasLimit.toNumber(),
      to: parsedTx.chainId || undefined,
      value: parsedTx.value.toNumber(),
      data: parsedTx.data,
      type: parsedTx.type
    });
  });
});
