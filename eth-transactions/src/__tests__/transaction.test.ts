import { arrayify, joinSignature } from '@ethersproject/bytes';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { verifyTypedData, Wallet } from '@ethersproject/wallet';
import { recoverTypedSignature, signTypedData, SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';
import { expect } from 'chai';
import { getAddress } from '@ethersproject/address';
import { serializeTransaction } from '../serializeTransaction';
import { parseTransaction } from '../parseTransaction';

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
  data: '0x1111',
  value: 0,
  gasLimit: 2100000,
  storageLimit: 20000,
  validUntil: 111000
};
const sig =
  '0xe9df6df3d6387a9e9357a2861ebe596925fd6f7cc7d582ba787eb08e84fa945f7caaea2f24281a1fe3e087b40ac03626ba540085b78917f58c5aff80fb4e782a1c';

//[chainId, nonce, gasLimit, to, value, data, eip712sig]
describe('transaction', () => {
  it('serializeTransaction signed', async () => {
    const data = {
      chainId: 0,
      nonce: 0,
      gasLimit: 2100000,
      to: undefined,
      value: 0,
      data: '0xcfae3217'
    };

    const tx = serializeTransaction(
      {
        chainId: 0,
        nonce: 0,
        gasLimit: 2100000,
        to: undefined,
        value: 0,
        data: '0xcfae3217'
      },
      sig
    );

    const parsedTx = parseTransaction(tx);

    expect(data).deep.equal({
      chainId: parsedTx.chainId,
      nonce: parsedTx.nonce,
      gasLimit: parsedTx.gasLimit.toNumber(),
      to: parsedTx.chainId || undefined,
      value: parsedTx.value.toNumber(),
      data: parsedTx.data
    });

    const parsedSig = joinSignature({ r: parsedTx.r!, s: parsedTx.s, v: parsedTx.v });

    expect(parsedSig).equal(sig);
  });

  it('serializeTransaction unsigned', async () => {
    const data = {
      chainId: 0,
      nonce: 0,
      gasLimit: 2100000,
      to: undefined,
      value: 0,
      data: '0xcfae3217'
    };

    const tx = serializeTransaction({
      chainId: 0,
      nonce: 0,
      gasLimit: 2100000,
      to: undefined,
      value: 0,
      data: '0xcfae3217'
    });

    const parsedTx = parseTransaction(tx);

    expect(data).deep.equal({
      chainId: parsedTx.chainId,
      nonce: parsedTx.nonce,
      gasLimit: parsedTx.gasLimit.toNumber(),
      to: parsedTx.chainId || undefined,
      value: parsedTx.value.toNumber(),
      data: parsedTx.data
    });
  });
});
