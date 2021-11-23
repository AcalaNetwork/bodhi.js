import { joinSignature } from '@ethersproject/bytes';
import { expect } from 'chai';
import { parseTransaction } from '../parseTransaction';
import { serializeTransaction } from '../serializeTransaction';
import { transactionHash } from '../transactionHash';
import { signTransaction } from '../signTransaction';

const privateKey = '0x4daddf7d5d2a9059e8065cb3ec50beabe2c23c7d6b3e380c1de8c40269acd85c';
const address = '0xb00cB924ae22b2BBb15E10c17258D6a2af980421';

const data = {
  chainId: 0,
  nonce: 0,
  salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
  gasLimit: 2100000,
  to: undefined,
  value: 0,
  data: '0xcfae3217',
  type: 96
};

//[chainId, nonce, gasLimit, to, value, data, eip712sig]
describe('transaction', () => {
  it('serializeTransaction signed', async () => {
    const ethersHash = transactionHash(data);
    const ethersSig = signTransaction(privateKey, data);

    const tx = serializeTransaction(data, ethersSig);

    const parsedTx = parseTransaction(tx);

    expect(data).deep.equal({
      chainId: parsedTx.chainId,
      nonce: parsedTx.nonce,
      gasLimit: parsedTx.gasLimit.toNumber(),
      to: parsedTx.chainId || undefined,
      value: parsedTx.value.toNumber(),
      salt: (parsedTx as any).salt,
      data: parsedTx.data,
      type: parsedTx.type
    });

    expect(parsedTx.hash).equal(ethersHash);

    const parsedSig = joinSignature({ r: parsedTx.r!, s: parsedTx.s, v: parsedTx.v });

    expect(parsedSig).equal(ethersSig);
    expect(parsedTx.from).equal(address);
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
      salt: (parsedTx as any).salt,
      data: parsedTx.data,
      type: parsedTx.type
    });
  });
});
