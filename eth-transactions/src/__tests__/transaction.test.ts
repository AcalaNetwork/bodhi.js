import { joinSignature } from '@ethersproject/bytes';
import { expect } from 'chai';
import { parseTransaction } from '../parseTransaction';
import { serializeTransaction } from '../serializeTransaction';

const sig =
  '0xe9df6df3d6387a9e9357a2861ebe596925fd6f7cc7d582ba787eb08e84fa945f7caaea2f24281a1fe3e087b40ac03626ba540085b78917f58c5aff80fb4e782a1c';

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
