import {
  ACA as ACA_ADDR,
  LP_LCDOT_DOT,
} from '@acala-network/contracts/utils/AcalaAddress';
import { BlockTagish, Eip1898BlockTag } from '@acala-network/eth-providers';
import { Contract, Wallet } from 'ethers';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  deployErc20,
  eth_blockNumber,
  eth_getCode,
  testSetup,
} from '../utils';

const { wallet } = testSetup;

const PRE_DEPLOYED_ADDRS = [
  ACA_ADDR,
  LP_LCDOT_DOT,
];

const tags = ['latest', 'earliest', 'finalized', 'safe'];

describe('eth_getCode', () => {
  let token: Contract;
  let tokenDeployedBlock: number;

  beforeAll(async () => {
    token = await deployErc20(wallet);
    tokenDeployedBlock = Number((await eth_blockNumber()).data.result);
  });

  it('can get contract code', async () => {
    const allAddrs = PRE_DEPLOYED_ADDRS.concat(token.address as any);

    for (const addr of allAddrs) {
      for (const t of tags) {
        const res = (await eth_getCode([addr, t])).data.result;

        if (t === 'earliest') {
          expect(res).to.equal('0x');
        } else {
          expect(res.length).to.greaterThan(2);
        }
      }
    }
  });

  it('returns empty for pending tag or non-exist contract address', async () => {
    const randAddr = Wallet.createRandom().address;
    for (const t of [...tags, 'pending']) {
      const res = (await eth_getCode([randAddr, t])).data.result;
      expect(res).to.equal('0x');
    }
  });

  it('supports calling historical blocks', async () => {
    const _getTokenCode = async (blockTag: BlockTagish | Eip1898BlockTag) =>
      (await eth_getCode([token.address, blockTag])).data.result;

    expect((await _getTokenCode('earliest'))).to.equal('0x');
    expect((await _getTokenCode({ blockNumber: tokenDeployedBlock - 1 }))).to.equal('0x');

    expect((await _getTokenCode('latest')).length).to.greaterThan(2);
    expect((await _getTokenCode({ blockNumber: tokenDeployedBlock })).length).to.greaterThan(2);
  });
});
