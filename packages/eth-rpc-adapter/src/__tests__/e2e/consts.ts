import { DUMMY_LOGS_BLOOM } from '@acala-network/eth-providers';

export const evmAccounts = [
  {
    privateKey: '0xa872f6cbd25a0e04a08b1e21098017a9e6194d101d75e13111f71410c59cd57f',
    evmAddress: '0x75E480dB528101a381Ce68544611C169Ad7EB342',
  },
  {
    privateKey: '0x4daddf7d5d2a9059e8065cb3ec50beabe2c23c7d6b3e380c1de8c40269acd85c',
    evmAddress: '0xb00cB924ae22b2BBb15E10c17258D6a2af980421',
  },
];

export const ADDRESS_ALICE = '0x82a258cb20e2adb4788153cd5eb5839615ece9a0';

export const DETERMINISTIC_SETUP_DEX_ADDRESS = '0x532394de2ca885b7e0306a2e258074cca4e42449';

export const KARURA_CONTRACT_CALL_TX_HASH = '0x33661888b04c81858c3603994eeb9a294c57b585bd86b4663ccd5e4fd7f2c325';
export const KARURA_CONTRACT_DEPLOY_TX_HASH = '0x56a429edfc1c07d7fd4c048e6e868dbaaa632fc329e7bb7ed744a48bca5bb493';
export const KARURA_SEND_KAR_TX_HASH = '0x69493fd597760d5ad3a81ebbbb48abcc686d33814e097b1db9fc172341c36dae';

export const deployHelloWorldData =
  '0x60806040526040518060400160405280600c81526020017f48656c6c6f20576f726c642100000000000000000000000000000000000000008152506000908051906020019061004f929190610062565b5034801561005c57600080fd5b50610166565b82805461006e90610134565b90600052602060002090601f01602090048101928261009057600085556100d7565b82601f106100a957805160ff19168380011785556100d7565b828001600101855582156100d7579182015b828111156100d65782518255916020019190600101906100bb565b5b5090506100e491906100e8565b5090565b5b808211156101015760008160009055506001016100e9565b5090565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061014c57607f821691505b602082108114156101605761015f610105565b5b50919050565b61022e806101756000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063c605f76c14610030575b600080fd5b61003861004e565b6040516100459190610175565b60405180910390f35b6000805461005b906101c6565b80601f0160208091040260200160405190810160405280929190818152602001828054610087906101c6565b80156100d45780601f106100a9576101008083540402835291602001916100d4565b820191906000526020600020905b8154815290600101906020018083116100b757829003601f168201915b505050505081565b600081519050919050565b600082825260208201905092915050565b60005b838110156101165780820151818401526020810190506100fb565b83811115610125576000848401525b50505050565b6000601f19601f8301169050919050565b6000610147826100dc565b61015181856100e7565b93506101618185602086016100f8565b61016a8161012b565b840191505092915050565b6000602082019050818103600083015261018f818461013c565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806101de57607f821691505b602082108114156101f2576101f1610197565b5b5091905056fea26469706673582212204d363ed34111d1be492d4fd086e9f2df62b3c625e89ade31f30e63201ed1e24f64736f6c63430008090033';

export const log6 = {
  blockNumber: '0x6',
  transactionIndex: '0x0',
  address: '0x0000000000000000000000000000000000000803',
  data: '0x0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000001d131f6171f000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000001',
  logIndex: '0x0',
  removed: false,
  topics: [
    '0x7b1ccce9b5299ff0ae3d9adc0855268a4ad3527b2bcde01ccadde2fb878ecb8a',
    '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
  ],
};

export const log7 = {
  blockNumber: '0x7',
  transactionIndex: '0x0',
  address: '0x0000000000000000000000000000000000000803',
  data: '0x0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000094b686d800000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000010000000000000000000000000000000000000000000100000000000000000002',
  logIndex: '0x0',
  removed: false,
  topics: [
    '0x7b1ccce9b5299ff0ae3d9adc0855268a4ad3527b2bcde01ccadde2fb878ecb8a',
    '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
  ],
};

export const log8 = {
  blockNumber: '0x8',
  transactionIndex: '0x0',
  address: '0x0000000000000000000000000000000000000803',
  data: '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000001',
  logIndex: '0x0',
  removed: false,
  topics: [
    '0x7b1ccce9b5299ff0ae3d9adc0855268a4ad3527b2bcde01ccadde2fb878ecb8a',
    '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
  ],
};

export const log9 = {
  blockNumber: '0x9',
  transactionIndex: '0x0',
  address: '0x0000000000000000000000000000000000000803',
  data: '0x0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000010000000000000000000000000000000000000000000100000000000000000002',
  logIndex: '0x0',
  removed: false,
  topics: [
    '0x7b1ccce9b5299ff0ae3d9adc0855268a4ad3527b2bcde01ccadde2fb878ecb8a',
    '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
  ],
};

export const log10 = {
  blockNumber: '0xa',
  transactionIndex: '0x0',
  address: '0x0000000000000000000000000000000000000803',
  data: '0x0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000748849ea0c000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000001',
  logIndex: '0x0',
  removed: false,
  topics: [
    '0x7b1ccce9b5299ff0ae3d9adc0855268a4ad3527b2bcde01ccadde2fb878ecb8a',
    '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
  ],
};

export const log11 = {
  blockNumber: '0xb',
  transactionIndex: '0x0',
  address: '0x0000000000000000000000000000000000000803',
  data: '0x000000000000000000000000000000000000000000000000000000e8d4a51000000000000000000000000000000000000000000000000000000000e8d4a51000',
  logIndex: '0x0',
  removed: false,
  topics: [
    '0x5b6f5f6550282279c4e72b95a8ba538bea92c64dec9e8c7c08a556d4457225c8',
    '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
    '0x0000000000000000000000000000000000000000000100000000000000000000',
    '0x0000000000000000000000000000000000000000000100000000000000000001',
  ],
};

export const log12 = {
  blockNumber: '0xc',
  transactionIndex: '0x0',
  address: '0x0000000000000000000000000000000000000803',
  data: '0x000000000000000000000000000000000000000000000000000000174876e800',
  logIndex: '0x0',
  removed: false,
  topics: [
    '0x038116623990e7d0fed04a27e35b5dc88000ea942b37360c5898ae750bfa5df6',
    '0x0000000000000000000000000230135fded668a3f7894966b14f42e65da322e4',
    '0x0000000000000000000000000000000000000000000100000000000000000000',
    '0x0000000000000000000000000000000000000000000100000000000000000001',
  ],
};

export const log13 = {
  blockNumber: '0xd',
  transactionIndex: '0x0',
  removed: false,
  address: '0xe85ef9063dd28f157eb97ca03f50f4a3bdecd37e',
  data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
  topics: [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0',
  ],
  logIndex: '0x0',
};

export const log14 = {
  blockNumber: '0xe',
  transactionIndex: '0x0',
  removed: false,
  address: '0x532394de2ca885b7e0306a2e258074cca4e42449',
  data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
  topics: [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0',
  ],
  logIndex: '0x0',
};

export const log20_0 = {
  blockNumber: '0x14',
  transactionIndex: '0x0',
  removed: false,
  address: '0x532394de2ca885b7e0306a2e258074cca4e42449',
  data: '0x0000000000000000000000000000000000000000000000000000000000002710',
  topics: [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0',
    '0x000000000000000000000000905c015e38c24ed973fd6075541a124c621fa743',
  ],
  logIndex: '0x0',
};

export const log20_1 = {
  blockNumber: '0x14',
  transactionIndex: '0x0',
  removed: false,
  address: '0xe85ef9063dd28f157eb97ca03f50f4a3bdecd37e',
  data: '0x00000000000000000000000000000000000000000000000000000000000003e8',
  topics: [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0',
    '0x000000000000000000000000905c015e38c24ed973fd6075541a124c621fa743',
  ],
  logIndex: '0x1',
};

export const log22_0 = {
  blockNumber: '0x16',
  transactionIndex: '0x0',
  removed: false,
  address: '0xe85ef9063dd28f157eb97ca03f50f4a3bdecd37e',
  data: '0x000000000000000000000000000000000000000000000000000000000000000a',
  topics: [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0',
    '0x000000000000000000000000905c015e38c24ed973fd6075541a124c621fa743',
  ],
  logIndex: '0x0',
};

export const log22_1 = {
  blockNumber: '0x16',
  transactionIndex: '0x0',
  removed: false,
  address: '0x532394de2ca885b7e0306a2e258074cca4e42449',
  data: '0x0000000000000000000000000000000000000000000000000000000000000062',
  topics: [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x000000000000000000000000905c015e38c24ed973fd6075541a124c621fa743',
    '0x00000000000000000000000082a258cb20e2adb4788153cd5eb5839615ece9a0',
  ],
  logIndex: '0x1',
};

export const allLogs = [log6, log7, log8, log9, log10, log11, log12, log13, log14, log20_0, log20_1, log22_0, log22_1];

export const karuraBlock2449983 = {
  hash: '0xbdae06c67294bca57bffd390c997d6730a837e1c11252d9bba00cac7384c1f16',
  parentHash: '0xfd3443eda6f3c9406b31175d9d8b9d497a0d3163f093d122ccb7d6c373e22fff',
  number: '0x25623f',
  stateRoot: '0x86203b2bd6ae7978c1f53cca5a57bf216b83f247fbcdb26ca55c760e39741074',
  transactionsRoot: '0xdbed29fd64f319f13f6c58311eb910fdc3c2e7aa686d58b822afee9469eee766',
  timestamp: '0x62f8bc54',
  nonce: '0x0000000000000000',
  mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  difficulty: '0x0',
  totalDifficulty: '0x0',
  gasLimit: '0x1c99cd6',
  gasUsed: '0x36c64',
  miner: '0xaa8b848056f89fc7f3bcc7c0a790ab8280423100',
  extraData: '0x',
  sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
  receiptsRoot: '0xdbed29fd64f319f13f6c58311eb910fdc3c2e7aa686d58b822afee9469eee766',
  logsBloom: DUMMY_LOGS_BLOOM,
  size: '0x398e',
  uncles: [],
  transactions: [
    {
      blockHash: '0xbdae06c67294bca57bffd390c997d6730a837e1c11252d9bba00cac7384c1f16',
      blockNumber: '0x25623f',
      transactionIndex: '0x0',
      hash: '0x7b0361f47dc0be798cb9f7d115d74d68960e685714c515df81dd1a17e3db0cff',
      from: '0x9cb3b68e0c48c53b70f465bda3ba6481a9cb7720',
      gasPrice: '0x15fde28667',
      value: '0x0',
      gas: '0x2b3e6',
      input:
        '0x36877dceeac06b4f60edb2a940a2170eea5cef018dc569f5d98b8176f5da7ea640c9bd2700000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000fef000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000001400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000010000000000000000008400000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000001550f7dca7000000000000000000000000000000000000000000000000000000000000000000d64a08aa86bbf7225c35a44854c181d80022883dc9dde1976f77aa984c841d7a8410102cd33c78438b8f2d7c1eb1b053c0630ebc5787b1dfcab0c019811dc32fbb532aa57f8293f2be947ac467d9d8dae7e700fba81a21745eb1bfbbdff26785b26edd7f83ddfb4c64a8e95afb16d4567f4899ebf1b12fddfeee80b89c755943ed8e9c4bec1dbd12cb450b8cedb4b622744e376cc0da08225111572522010fd0d49e12e0b6acb81cb419c3f4c187b0b4c15377be15efa1f3b23b60d73263eb10c87abdcafb6b60c06f42145596c0eeecacb8d86e69e4210787250f7eef601c96163f1d8a0aa98b7cd67da0b8f69fcaa70e4649b0107d65a86e8940fb4197578b903a43eeca16395c04cc9bd080ed66ba205706331b9572f1bf2c528e7af23f46b637b37a59a219b36fed2c4ae586bfdec199ae0b3cc261dae4854dca625a6a79913258b595af6a8abbabb043bb5d6ca6f0553ed59e05cc8b25a6f10b40ffe598c36bad9b6f945a1e85d980c5bf5b016059e0aee384a32a729d393b5214f2638a08918e3dea5e9eded8b0060a49195b0e18e4c698fb9dfe8f2d16bc47494b70ceb',
      to: '0x30385059196602a1498f5f8ef91f3450e3a7b27a',
      nonce: '0x3',
      v: '0x25',
      r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
      s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
    },
    {
      blockHash: '0xbdae06c67294bca57bffd390c997d6730a837e1c11252d9bba00cac7384c1f16',
      blockNumber: '0x25623f',
      transactionIndex: '0x1',
      hash: '0x9824e1111ba926db7df3091ec45344f224a3086daf5580eaf7ab3e6bf5a6dde6',
      from: '0xc760da3c525c8511938c35613684c3f6175c01a5',
      gasPrice: '0xb460f6718',
      value: '0x0',
      gas: '0x200b20',
      input: '0x',
      to: '0x1f3a10587a20114ea25ba1b388ee2dd4a337ce27',
      nonce: '0x65',
      v: '0x25',
      r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
      s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
    },
  ],
};

export const karuraBlock1818188 = {
  hash: '0x5108a4f02624cc0fca4d68ab3429503249525218a1c23f38a2cf40b1f3456fab',
  parentHash: '0x0af99e49b978dfeddc023f32a96fc4907aa99409c1804380fca5e0767ca5624f',
  number: '0x1bbe4c',
  stateRoot: '0xb234e197e811f9402fc3cc9b46a953d7c20ff54fbe5a65fa89315d786a6839fe',
  transactionsRoot: '0x9482be879e7e6984d5c4071ef21fff39232c95331f12b14c0ca70e7eb6ef9df4',
  timestamp: '0x626b3a76',
  nonce: '0x0000000000000000',
  mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  difficulty: '0x0',
  totalDifficulty: '0x0',
  gasLimit: '0x1c99cd6',
  gasUsed: '0x0',
  miner: '0x520425df7e86cb8dffd8fd140b075140b28f9629',
  extraData: '0x',
  sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
  receiptsRoot: '0x9482be879e7e6984d5c4071ef21fff39232c95331f12b14c0ca70e7eb6ef9df4',
  logsBloom: DUMMY_LOGS_BLOOM,
  size: '0x1e5f',
  uncles: [],
  transactions: [],
};

export const karuraBlock1818518 = {
  hash: '0xab9f0519e9f9885861da35765dad61161c5f939c66b4c4b7091f7e9555e9f92f',
  parentHash: '0xf7e284c6d581bb34c2234c5c0a60ed1303a88e905328f4b7fc76c93e2da15c51',
  number: '0x1bbf96',
  stateRoot: '0xa02039723e96992aca76880a27b3d3da63bcbef0e932f27a7180276a2033c040',
  transactionsRoot: '0xcf70602c561d49922720605e4a670cdacd0474477c126cb6459f0e3ae3c1fd4b',
  timestamp: '0x626b5756',
  nonce: '0x0000000000000000',
  mixHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
  difficulty: '0x0',
  totalDifficulty: '0x0',
  gasLimit: '0x1c99cd6',
  gasUsed: '0x3181f',
  miner: '0x576482c15d3e4ec12c0577c611d3ed05eadfed46',
  extraData: '0x',
  sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
  receiptsRoot: '0xcf70602c561d49922720605e4a670cdacd0474477c126cb6459f0e3ae3c1fd4b',
  logsBloom: DUMMY_LOGS_BLOOM,
  size: '0x1f5a',
  uncles: [],
  transactions: [
    {
      blockHash: '0xab9f0519e9f9885861da35765dad61161c5f939c66b4c4b7091f7e9555e9f92f',
      blockNumber: '0x1bbf96',
      transactionIndex: '0x0',
      hash: '0x79090e3e64da12012839fb40f95ad03703a6d3c999c262b4196796f9753861ca',
      from: '0x0000000000000000000000000000000000000000',
      gasPrice: '0x4ced5668c50',
      value: '0x0',
      gas: '0x200b20',
      input: '0x',
      to: null,
      nonce: '0x1cb',
      v: '0x25',
      r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
      s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
    },
  ],
};

export const karuraContractCallTxReceipt = {
  to: '0xff066331be693be721994cf19905b2dc7475c5c9',
  from: '0x99537d82f6f4aad1419dd14952b512c7959a2904',
  contractAddress: null,
  transactionIndex: '0x0',
  gasUsed: '0x12a44',
  logsBloom: DUMMY_LOGS_BLOOM,
  blockHash: '0x073b225ae078184815ed7e3d51c35ab44cef6cba3a9cde2bbf6e360e2844cc55',
  transactionHash: '0x33661888b04c81858c3603994eeb9a294c57b585bd86b4663ccd5e4fd7f2c325',
  logs: [
    {
      transactionIndex: '0x0',
      blockNumber: '0x2ac207',
      transactionHash: '0x33661888b04c81858c3603994eeb9a294c57b585bd86b4663ccd5e4fd7f2c325',
      address: '0xff066331be693be721994cf19905b2dc7475c5c9',
      topics: [
        '0x9e6c2a5268879d41429e8c2d6f88e2c3d1a20752070e9afb3f6b9aa9dbb01a90',
        '0x0000000000000000000000000000000000000000000000000000000000000012',
        '0x7ba288a014555c9b1446b215605b4f6803e68a8b430bcbc08e75400e4b38a1a1',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      ],
      data: '0x00000000000000000000000000000000000000000000000000000000002a8aa000000000000000000000000000000000000000000000000000000000002ac150000000000000000000000000000000000000000000000000000000006340cef600000000000000000000000000000000000000000000000000000000002ac207',
      logIndex: '0x0',
      blockHash: '0x073b225ae078184815ed7e3d51c35ab44cef6cba3a9cde2bbf6e360e2844cc55',
    },
  ],
  blockNumber: '0x2ac207',
  cumulativeGasUsed: '0x0',
  effectiveGasPrice: '0xc691dc448',
  status: '0x1',
  type: '0x0',
};

export const karuraSendKarTxReceipt = {
  to: '0xffffd2ff9b840f6bd74f80df8e532b4d7886ffff',
  from: '0xffffd2ff9b840f6bd74f80df8e532b4d7886ffff',
  contractAddress: null,
  transactionIndex: '0x0',
  gasUsed: '0x5208',
  logsBloom: DUMMY_LOGS_BLOOM,
  blockHash: '0x4a73ca4a52fa1a6bd1328414194230cbfe3b0d7922cf026fbb31ce7db498de33',
  transactionHash: '0x69493fd597760d5ad3a81ebbbb48abcc686d33814e097b1db9fc172341c36dae',
  logs: [],
  blockNumber: '0x2ac93c',
  cumulativeGasUsed: '0x0',
  effectiveGasPrice: '0x1bb7d40e19',
  status: '0x1',
  type: '0x0',
};

export const karuraContractDeployTxReceipt = {
  to: null,
  from: '0xe2e2d9e31d7e1cc1178fe0d1c5950f6c809816a3',
  contractAddress: '0xa321448d90d4e5b0a732867c18ea198e75cac48e',
  transactionIndex: '0x0',
  gasUsed: '0x560dc',
  logsBloom: DUMMY_LOGS_BLOOM,
  blockHash: '0x6b1378795aeedc85a88d40b2d48cf0e2408f783ba84f7cea068bfbb3ff3ad90a',
  transactionHash: '0x56a429edfc1c07d7fd4c048e6e868dbaaa632fc329e7bb7ed744a48bca5bb493',
  logs: [
    {
      transactionIndex: '0x0',
      blockNumber: '0x1bd799',
      transactionHash: '0x56a429edfc1c07d7fd4c048e6e868dbaaa632fc329e7bb7ed744a48bca5bb493',
      address: '0xa321448d90d4e5b0a732867c18ea198e75cac48e',
      topics: [
        '0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b',
        '0x000000000000000000000000141fba8ad5d61bdab45a047cf60b5ad9784987fb',
      ],
      data: '0x',
      logIndex: '0x0',
      blockHash: '0x6b1378795aeedc85a88d40b2d48cf0e2408f783ba84f7cea068bfbb3ff3ad90a',
    },
    {
      transactionIndex: '0x0',
      blockNumber: '0x1bd799',
      transactionHash: '0x56a429edfc1c07d7fd4c048e6e868dbaaa632fc329e7bb7ed744a48bca5bb493',
      address: '0xa321448d90d4e5b0a732867c18ea198e75cac48e',
      topics: [
        '0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b',
        '0x000000000000000000000000c0946f51ddd63e12c51b23f5814b43c9bc8aa700',
      ],
      data: '0x',
      logIndex: '0x1',
      blockHash: '0x6b1378795aeedc85a88d40b2d48cf0e2408f783ba84f7cea068bfbb3ff3ad90a',
    },
  ],
  blockNumber: '0x1bd799',
  cumulativeGasUsed: '0x0',
  effectiveGasPrice: '0x2e73326680e',
  status: '0x1',
  type: '0x0',
};

export const karuraSendKarTx = {
  blockHash: '0x4a73ca4a52fa1a6bd1328414194230cbfe3b0d7922cf026fbb31ce7db498de33',
  blockNumber: '0x2ac93c',
  transactionIndex: '0x0',
  hash: '0x69493fd597760d5ad3a81ebbbb48abcc686d33814e097b1db9fc172341c36dae',
  from: '0xffffd2ff9b840f6bd74f80df8e532b4d7886ffff',
  gasPrice: '0x1bb7d40e19',
  value: '0x1121d33597384000',
  gas: '0x5728',
  input: '0x',
  to: '0xffffd2ff9b840f6bd74f80df8e532b4d7886ffff',
  nonce: '0x41',
  v: '0x25',
  r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
  s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
};

export const karuraContractCallTx = {
  blockHash: '0x073b225ae078184815ed7e3d51c35ab44cef6cba3a9cde2bbf6e360e2844cc55',
  blockNumber: '0x2ac207',
  transactionIndex: '0x0',
  hash: '0x33661888b04c81858c3603994eeb9a294c57b585bd86b4663ccd5e4fd7f2c325',
  from: '0x99537d82f6f4aad1419dd14952b512c7959a2904',
  gasPrice: '0xc691dc448',
  value: '0x0',
  gas: '0xc3500',
  input:
    '0x29941edd7ba288a014555c9b1446b215605b4f6803e68a8b430bcbc08e75400e4b38a1a10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000002a8aa000000000000000000000000000000000000000000000000000000000002ac150',
  to: '0xff066331be693be721994cf19905b2dc7475c5c9',
  nonce: '0x98',
  v: '0x25',
  r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
  s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
};

export const karuraContractDeployTx = {
  blockHash: '0x6b1378795aeedc85a88d40b2d48cf0e2408f783ba84f7cea068bfbb3ff3ad90a',
  blockNumber: '0x1bd799',
  transactionIndex: '0x0',
  hash: '0x56a429edfc1c07d7fd4c048e6e868dbaaa632fc329e7bb7ed744a48bca5bb493',
  from: '0xe2e2d9e31d7e1cc1178fe0d1c5950f6c809816a3',
  gasPrice: '0x2e73326680e',
  value: '0x0',
  gas: '0x1406f40',
  input:
    '0x608060405234801561001057600080fd5b5060405161078f38038061078f83398101604081905261002f91610314565b818161005c60017f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbd61042c565b6000805160206107488339815191521461008657634e487b7160e01b600052600160045260246000fd5b6100928282600061009b565b50505050610491565b6100a4836100d1565b6000825111806100b15750805b156100cc576100ca838361011160201b6100291760201c565b505b505050565b6100da8161013d565b6040516001600160a01b038216907fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b90600090a250565b60606101368383604051806060016040528060278152602001610768602791396101fd565b9392505050565b610150816102d260201b6100551760201c565b6101b75760405162461bcd60e51b815260206004820152602d60248201527f455243313936373a206e657720696d706c656d656e746174696f6e206973206e60448201526c1bdd08184818dbdb9d1c9858dd609a1b60648201526084015b60405180910390fd5b806101dc60008051602061074883398151915260001b6102d860201b61005b1760201c565b80546001600160a01b0319166001600160a01b039290921691909117905550565b6060833b61025c5760405162461bcd60e51b815260206004820152602660248201527f416464726573733a2064656c65676174652063616c6c20746f206e6f6e2d636f6044820152651b9d1c9858dd60d21b60648201526084016101ae565b600080856001600160a01b03168560405161027791906103dd565b600060405180830381855af49150503d80600081146102b2576040519150601f19603f3d011682016040523d82523d6000602084013e6102b7565b606091505b5090925090506102c88282866102db565b9695505050505050565b3b151590565b90565b606083156102ea575081610136565b8251156102fa5782518084602001fd5b8160405162461bcd60e51b81526004016101ae91906103f9565b60008060408385031215610326578182fd5b82516001600160a01b038116811461033c578283fd5b60208401519092506001600160401b0380821115610358578283fd5b818501915085601f83011261036b578283fd5b81518181111561037d5761037d61047b565b604051601f8201601f19908116603f011681019083821181831017156103a5576103a561047b565b816040528281528860208487010111156103bd578586fd5b6103ce83602083016020880161044f565b80955050505050509250929050565b600082516103ef81846020870161044f565b9190910192915050565b602081526000825180602084015261041881604085016020870161044f565b601f01601f19169190910160400192915050565b60008282101561044a57634e487b7160e01b81526011600452602481fd5b500390565b60005b8381101561046a578181015183820152602001610452565b838111156100ca5750506000910152565b634e487b7160e01b600052604160045260246000fd5b6102a8806104a06000396000f3fe60806040523661001357610011610017565b005b6100115b61002761002261005e565b610096565b565b606061004e838360405180606001604052806027815260200161024c602791396100ba565b9392505050565b3b151590565b90565b60006100917f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc546001600160a01b031690565b905090565b3660008037600080366000845af43d6000803e8080156100b5573d6000f35b3d6000fd5b6060833b61011e5760405162461bcd60e51b815260206004820152602660248201527f416464726573733a2064656c65676174652063616c6c20746f206e6f6e2d636f6044820152651b9d1c9858dd60d21b60648201526084015b60405180910390fd5b600080856001600160a01b03168560405161013991906101cc565b600060405180830381855af49150503d8060008114610174576040519150601f19603f3d011682016040523d82523d6000602084013e610179565b606091505b5091509150610189828286610193565b9695505050505050565b606083156101a257508161004e565b8251156101b25782518084602001fd5b8160405162461bcd60e51b815260040161011591906101e8565b600082516101de81846020870161021b565b9190910192915050565b602081526000825180602084015261020781604085016020870161021b565b601f01601f19169190910160400192915050565b60005b8381101561023657818101518382015260200161021e565b83811115610245576000848401525b5050505056fe416464726573733a206c6f772d6c6576656c2064656c65676174652063616c6c206661696c6564a26469706673582212203ee6993445d26cb1f3937811bd071a1164dee553ec2fc9b1ae9ba0be2a91946f64736f6c63430008040033360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc416464726573733a206c6f772d6c6576656c2064656c65676174652063616c6c206661696c6564000000000000000000000000141fba8ad5d61bdab45a047cf60b5ad9784987fb000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e434a5fcd4000000000000000000000000c0946f51ddd63e12c51b23f5814b43c9bc8aa70000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000b00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000100000000000000000000000058cc3ae5c097b213ce3c81979e1b9f9570746aa500000000000000000000000000000000000000000000000000000000',
  to: null,
  nonce: '0x4',
  v: '0x25',
  r: '0x1b5e176d927f8e9ab405058b2d2457392da3e20f328b16ddabcebc33eaac5fea',
  s: '0x4ba69724e8f69de52f0125ad8b3c5c2cef33019bac3249e2c0a2192766d1721c',
};