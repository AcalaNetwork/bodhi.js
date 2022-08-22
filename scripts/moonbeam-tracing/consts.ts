import { BigNumber } from 'ethers';

export const maliciousAddresses = [
  '0x2b8221f97766b0498f4ac578871d088100176749',
  '0x57f73c4bff8ebe0fdd91c666fd304804d50fc218',
  '0x1cb3c6b77fde279cf7403a5c0ae2d5fc9d356a55',
  '0x4ac4ff89b9d4b3daf54942e3df63751a4a54c735',
  '0xbd03a214ebc891b3a9e3fe4cba793c5f9f0b38b0',
  '0xebaee4e53e5c286c4b5f0027777eb72bc8b94bf7',
  '0x029dc993d0053b717a69cac26157f4ea466a907a',
  '0xb600e3b53dc0b8a941b92301f4411ac2e31ae4a2',
  '0x30c4abab7ec022c27022aa39f687984e5acba13d',
  '0x80e639e6a2c90b05cdce2701a66ef096852093c8',
  '0xd11b9d446a20b74d9fefb185d847692d84c4b95e',
  '0x07d6e8987a17b95eee44fbd2b7bb65c34442a5c7',
  '0xee7c4aca7d64075550f1b119b4bb4a0aa889c340',
  '0xb82ed2d0dfcd3ad43b3cbfab1f5e9c316f283f9c',
  '0x355b8f6059f5414ab1f69fca34088c4adc554b7f',
  '0x8ff448ed0c027dbe9f5add62e6faee439eac0259',
  '0xf4de3f93ebca01015486be5979d9c01aeeddd367',
  '0x356eb354aea711854e1d69a36643e181a1da8ba5',
  '0x6b99b14cbed12e1f2b8c70681cce0874e24661ee',
  '0x627683779b1fe41a2b350f67a9e8876def078cbb',
  '0x08c3e7b6e273d4434fa466ff23dba7c602a961a7',
  '0x6ab079df6d9f2e6cad08736bba0fb8f35cc0ca40',
  '0xa22868cfd826d0fcf543bdf1814e556e69903f11',
  '0x66721389fd8f9403b1d161fc52b35f906d5421cc',
  '0x5f9febf1f2a99fe11edad119462db23f28a6ddbb',
  '0x08abb2e7b586d80543b61daa91a9d134234d26d5',
  '0xcf43e9a2f9ed4810de89ae08d88445d8ccf63ab1',
  '0x341396d458060aba2ba7ebf1aecf2aab7aea878f',
  '0x3b6a66017b75f04e55c73664dd6a9cf2c8027e0e',
  '0x68be80372bed6078cf58b71a46171697adf678f5'
];

export const XTOKEN_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'currency_address', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      {
        components: [
          { internalType: 'uint8', name: 'parents', type: 'uint8' },
          { internalType: 'bytes[]', name: 'interior', type: 'bytes[]' }
        ],
        internalType: 'struct Xtokens.Multilocation',
        name: 'destination',
        type: 'tuple'
      },
      { internalType: 'uint64', name: 'weight', type: 'uint64' }
    ],
    name: 'transfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'uint8', name: 'parents', type: 'uint8' },
          { internalType: 'bytes[]', name: 'interior', type: 'bytes[]' }
        ],
        internalType: 'struct Xtokens.Multilocation',
        name: 'asset',
        type: 'tuple'
      },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      {
        components: [
          { internalType: 'uint8', name: 'parents', type: 'uint8' },
          { internalType: 'bytes[]', name: 'interior', type: 'bytes[]' }
        ],
        internalType: 'struct Xtokens.Multilocation',
        name: 'destination',
        type: 'tuple'
      },
      { internalType: 'uint64', name: 'weight', type: 'uint64' }
    ],
    name: 'transfer_multiasset',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

export const ERC20_TRANSFER_TOPIC_SIG = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export const ONE_ETHER = BigNumber.from(1000000000000000000n);

export const binance1 = '0xF3918988Eb3Ce66527E2a1a4D42C303915cE28CE';
