import { BigNumber } from '@ethersproject/bignumber';

export const ZERO = 0;
export const BIGNUMBER_ONE = BigNumber.from(1);
export const EMPTY_HEX_STRING = '0x';

export const BIGNUMBER_ZERO = BigNumber.from(ZERO);

export const GAS_PRICE = BIGNUMBER_ONE;
export const MAX_FEE_PER_GAS = BIGNUMBER_ONE;
export const MAX_PRIORITY_FEE_PER_GAS = BIGNUMBER_ONE;
export const U32MAX = BigNumber.from('0xffffffff');
export const U64MAX = BigNumber.from('0xffffffffffffffff');

export const DUMMY_BLOCK_HASH = '0xdummydummy';
export const DUMMY_ADDRESS = '0x1111111111333333333355555555558888888888';
export const DUMMY_SUBSTRATE_ADDR = '22vb7enW9XTfneQYsBNMdnzg1GDXqgtSMGBJp96C1ge971My';
export const DUMMY_LOGS_BLOOM =
  '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
export const DUMMY_V = '0x25';
export const DUMMY_R = '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea';
export const DUMMY_S = '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c';
export const DUMMY_V_R_S = {
  v: DUMMY_V,
  r: DUMMY_R,
  s: DUMMY_S,
};
export const DUMMY_BLOCK_NONCE = '0x0000000000000000';
export const ZERO_BLOCK_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const EMTPY_UNCLE_HASH = '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347';
export const EMTPY_UNCLES = [];
export const ERROR_PATTERN = [
  // Assume that Error is nested only once
  /execution fatal: Module\(ModuleError { index: (\d+), error: \[(\d+), 0, 0, 0\], message: None }\)/,
  /execution fatal: Module\(ModuleError { index: (\d+), error: (\d+), message: None }\)/,
];
export const ERC20_ABI = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',

  // Authenticated Functions
  'function transfer(address to, uint amount) returns (bool)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)',
];

export const LOCAL_MODE_MSG = `
  -------------------------------
  🔨 local development mode is ON
  ❌ don't use it for production!
  -------------------------------
`;

export const PROD_MODE_MSG = `
  ------------------------------------------
  ⚡️ running in production (standard) mode ⚡️
  ------------------------------------------
`;

export const SAFE_MODE_WARNING_MSG = `
  ------------------------------- WARNING -----------------------------
  🔒 SafeMode is ON, and RPCs behave very differently than usual world!
  ❗ This mode is DEPRECATED, please use \`finalized\` block tag 
  ---------------------------------------------------------------------
`;

export const CACHE_SIZE_WARNING = `
  ------------------- WARNING -------------------
  Max cached blocks is big, please be cautious!
  If memory exploded, try decrease MAX_CACHE_SIZE
  -----------------------------------------------
`;

export const ORPHAN_TX_DEFAULT_INFO = {
  value: '0x0',
  gas: 2_100_000,
  input: '0x',
  nonce: 0,
  ...DUMMY_V_R_S,
};

export const BLOCK_GAS_LIMIT = 29_990_016;
export const BLOCK_STORAGE_LIMIT = 3_670_016;
export const MAX_GAS_LIMIT_CC = 22;  // log2(BLOCK_STORAGE_LIMIT)

export const ONE_GWEI = 1_000_000_000n;
export const TEN_GWEI = ONE_GWEI * 10n;
export const ONE_HUNDRED_GWEI = ONE_GWEI * 100n;
export const ONE_THOUSAND_GWEI = ONE_GWEI * 1000n;

export const GAS_MASK = 100000;
export const STORAGE_MASK = 100;
export const GAS_LIMIT_CHUNK = BigNumber.from(30000);

export const U32_MAX = 4_294_967_295n;
