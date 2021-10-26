import { EvmRpcProvider } from '../rpc-provider';
import { isSubstrateAddress, isEvmAddress, computeDefaultEvmAddress, computeDefaultSubstrateAddress } from '../utils';

console.log('account test start...');

const AliceAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

describe('account test', () => {
  it('computeDefaultEvmAddress', async () => {
    const result = computeDefaultEvmAddress(AliceAddress);
    expect(result).toBe('0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0');
  });

  it('computeDefaultSubstrateAddress', async () => {
    const result = computeDefaultSubstrateAddress('0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0');
    expect(result).toBe('5EMjscznMK5opL14aMfTA36LqfziKAcYaQH86FPXMZ4vpobR');
  });

  it('isSubstrateAddress', async () => {
    expect(isSubstrateAddress(AliceAddress)).toBe(true);
    expect(isSubstrateAddress(AliceAddress + '1')).toBe(false);
    expect(isSubstrateAddress(AliceAddress.toLowerCase())).toBe(false);
  });

  it('isEvmAddress', async () => {
    expect(isEvmAddress('0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0')).toBe(true);
    expect(isEvmAddress('0x82A258cb20E2ADB4788153cd5eb5839615EcE9a0' + '1')).toBe(false);
    expect(isEvmAddress('0x82a258cb20E2ADB4788153cd5eb5839615EcE9a0')).toBe(false);
  });
});
