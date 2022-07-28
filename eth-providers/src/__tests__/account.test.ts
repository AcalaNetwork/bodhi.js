import { expect } from 'chai';
import { describe, it } from 'vitest';
import { computeDefaultEvmAddress, computeDefaultSubstrateAddress, isEvmAddress, isSubstrateAddress } from '../utils';

console.log('account test start...');

const AliceAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

describe('account test', () => {
  it('computeDefaultEvmAddress', async () => {
    const result = computeDefaultEvmAddress(AliceAddress);
    expect(result).to.equal('0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0');
  });

  it('computeDefaultSubstrateAddress', async () => {
    const result = computeDefaultSubstrateAddress('0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0');
    expect(result).to.equal('5EMjscznMK5opL14aMfTA36LqfziKAcYaQH86FPXMZ4vpobR');
  });

  it('isSubstrateAddress', async () => {
    expect(isSubstrateAddress(AliceAddress)).to.equal(true);
    expect(isSubstrateAddress(AliceAddress + '1')).to.equal(false);
    expect(isSubstrateAddress(AliceAddress.toLowerCase())).to.equal(false);
  });

  it('isEvmAddress', async () => {
    expect(isEvmAddress('0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0')).to.equal(true);
    expect(isEvmAddress('0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0' + '1')).to.equal(false);
    expect(isEvmAddress('0x82a258cb20E2ADB4788153cd5eb5839615EcE9a0')).to.equal(false);
  });
});
