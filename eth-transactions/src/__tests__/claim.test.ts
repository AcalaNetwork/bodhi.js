import { Wallet } from '@ethersproject/wallet';
import { expect } from 'chai';
import { describe, it } from 'vitest';
import { createClaimPayload } from '../createClaimPayload';
import { createClaimSignature } from '../createClaimSignature';

describe('create Claim Signature', () => {
  it('invalid substrateAddress', async () => {
    expect(() => {
      createClaimPayload({
        salt: '0x000',
        chainId: 55,
        substrateAddress: '5G'
      });
    }).throw('invalid substrateAddress');
  });

  it('missing salt', async () => {
    expect(() => {
      // @ts-ignore
      createClaimPayload({
        chainId: 55,
        substrateAddress: '5G'
      });
    }).throw('missing salt');
  });

  it('missing chainId', async () => {
    expect(() => {
      // @ts-ignore
      createClaimPayload({
        salt: '0x000',
        substrateAddress: '5G'
      });
    }).throw('missing chainId');
  });

  it('claim payload', async () => {
    const payload = createClaimPayload({
      salt: '0x702ba380a53e096363da1b73f2a05faff77c274fd356253eb877e6d221b7ffe7',
      chainId: 595,
      substrateAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    });

    expect(payload.domain.name).equal('Acala EVM claim');
  });

  it('create claim signature', async () => {
    const wallet = new Wallet('0xc192608c543cda2e2c2a2ec33237d4e9d0922831bdac423c90af697dee017aaf');

    expect(wallet.address).equal('0x183d3DDcF0D69A84677ab1aC42a7014dA7971695');

    const signature = createClaimSignature(wallet.privateKey, {
      salt: '0x702ba380a53e096363da1b73f2a05faff77c274fd356253eb877e6d221b7ffe7',
      chainId: 595,
      substrateAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    });

    expect(signature).equal(
      '0xd71741a11559335ce336daad28bb04bd0ed2977b9da31a1f7686162209a151676cbc475679844ff98febe3e439fec3c24ddf5560467a5f53cc1472d4eada8a211c'
    );
  });
});
