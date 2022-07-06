// Import
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { createTestPairs } from '@polkadot/keyring/testingPairs';
const { xxhashAsHex } = require('@polkadot/util-crypto');
import '@polkadot/api-augment';

const sleep = (x: number) => new Promise((r) => setTimeout(r, x));

const snapshots: [string, string][][] = [];

const getEVMStorage = async (api: ApiPromise): Promise<[string, string][]> => {
  // const prefixes = ['0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9' /* System.Account */];
  // const skippedModulesPrefix = ['System', 'Session', 'Babe', 'Grandpa', 'GrandpaFinality', 'FinalityTracker', 'Authorship'];

  // const metadata = await api.rpc.state.getMetadata();
  // const modules = metadata.asLatest.pallets;
  // modules.forEach((module) => {
  //   if (module.storage) {
  //     if (!skippedModulesPrefix.includes(module.name.toString())) {
  //       console.log(module.name.toString(), xxhashAsHex(module.name, 128))
  //       prefixes.push(xxhashAsHex(module.name, 128));
  //     }
  //   }
  // });
  // console.log(prefixes)

  const allStorage = await api.rpc.state.getPairs('0x');

  const prefixes = [
    '0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9' /* System.account */,
    '0xc2261276cc9d1f8598ea4b6a74b15c2f' /* Balances */,

    '0xbd2a529379475088d3e29a918cd47872' /* RandomnessCollectiveFlip */,
    '0xf0c365c3cf59d671eb72da0e7a4113c4' /* Timestamp */,
    '0x1a736d37504c2e3fb73dad160c55b291' /* Indices */,
    '0x3f1467a096bcd71a5b6a0c8155e20810' /* TransactionPayment */,
    '0xd57bce545fb382c34570e5dfbf338f5e' /* Authorship */,
    '0x5f3e4907f716ac89b6347d15ececedca' /* Staking */,
    '0xd5c41b52a371aa36c9254ce34324f2a5' /* Offences */,
    '0xcec5070d609dd3497f72bde07fc96ba0' /* Session */,
    '0x2b06af9719ac64d755623cda8ddd9b94' /* ImOnline */,
    '0x2099d7f109d6e535fb000bba623fd440' /* AuthorityDiscovery */,
    '0xf2794c22e353e9a839f12faab03a911b' /* Democracy */,
    '0x11f3ba2e1cdd6d62f2ff9b5589e7ff81' /* Instance1Collective */,
    '0x8985776095addd4789fccbce8ca77b23' /* Instance2Collective */,
    '0xe2e62dd81c48a88f73b6f6463555fd8e' /* PhragmenElection */,
    '0x492a52699edf49c972c21db794cfcf57' /* Instance1Membership */,
    '0x89d139e01a5eb2256f222e5fc5dbe6b3' /* Treasury */,
    '0x9c5d795d0297be56027a4b2464e33397' /* Claims */,
    '0x0b76934f4cc08dee01012d059e1b83ee' /* Parachains */,
    '0xae394d879ddf7f99595bc0dd36e355b5' /* Attestations */,
    '0x6ac983d82528bf1595ab26438ae5b2cf' /* Slots */,
    '0x3fba98689ebed1138735e0e7a5a790ab' /* Registrar */,
    '0xd5e1a2fa16732ce6906189438c0a82c6' /* Utility */,
    '0x2aeddc77fe58c98d50bd37f1b90840f9' /* Identity */,
    '0x426e15054d267946093858132eb537f1' /* Society */,
    '0xa2ce73642c549ae79c14f0a671cf45f9' /* Recovery */,
    '0x5f27b51b5ec208ee9cb25b55d8728243' /* Vesting */,
    '0x3db7a24cfdc9de785974746c14a99df9' /* Scheduler */,
    '0x1809d78346727a0ef58c0fa03bafa323' /* Proxy */,
    '0x7474449cca95dc5d0c00e71735a6d17d' /* Multisig */,

    '0x1da53b775b270400e7e61ed5cbc5a146' /* EVM */,
    '0xcf0c70dd409fefa08af26a0e93f12579' /* evmAccounts */,
    '0x99971b5749ac43e0235e41b0d3786918' /* Tokens */,

    '0x27d8f27ebb1cb80e1480db4fc4cfccb5' /* EVMBridge */,
    '0x6f90f7f374a081c4f7c5e6b64be8a12e' /* Currencies */,
    '0x6e9a9b71050cd23f2d7d1b72e8c1a625' /* AssetRegistry */,
    '0x8d4649c9ee31ba6b2d10c66f5fcc252e' /* UnknownTokens */
  ];

  const targetStorage = allStorage.filter((pair) => prefixes.some((prefix) => pair[0].toJSON().startsWith(prefix)));

  const data = targetStorage.map((s) => s.toJSON() as [string, string]);
  console.log('evm storage length:', data.length);

  return data;
};

const snapshot = async (api: ApiPromise): Promise<number> => {
  const data = await getEVMStorage(api);

  // const evmStorage = data.filter(d => d[0].startsWith('0x1da53b775b270400e7e61ed5cbc5a146'));
  // console.log('!!!!!!!!!!!!!', evmStorage, JSON.stringify(evmStorage.filter(s => s[0] === '0x1da53b775b270400e7e61ed5cbc5a14629f09a1b1e65650877530fe7894f3789cd6aa4f8ab5af50cba48a2f4ce013b8e261d16565c20b57de3f0d6e7de54e9c6'), null, 2))
  // console.log(JSON.stringify(evmStorage, null, 2))

  require('fs').writeFile('storage.json', JSON.stringify(data), console.log);
  return snapshots.push(data) - 1;
  // return snapshots.push(allStorage.map(s => s.toJSON() as [string, string])) - 1;
};

const revert = async (api: ApiPromise, id?: number): Promise<string> => {
  const { alice: sudoPair, bob: sudoPair2 } = createTestPairs();
  // const keyring = new Keyring({ type: 'sr25519' });
  // const sudoKey = await api.query.sudo.key();
  // const sudoPair = keyring.getPair('//Alice');

  // const data = id ? snapshots[id] : snapshots.at(-1);
  // if (!data) {
  //   throw new Error(`snapshot not found, id: ${id}`);
  // }

  const snapshot = require('./storage.json') as [string, string][];

  const data = await getEVMStorage(api);

  const prefix2Remove = data
    .map((x) => x[0])
    .filter(
      (x) =>
        x !==
        '0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9de1e86a9a8c739864cf3cc5ec2bea59fd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d'
    );

  // console.log(JSON.stringify(prefix2Remove, null, 2));

  // const aliceStorage = [
  //   '0x26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9de1e86a9a8c739864cf3cc5ec2bea59fd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d'
  //   '0x0000000000000000050000000000000040f1152e529de67c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
  // ];

  // for (const m of targetModules) {
  //   console.log(`killing ${m} ...`)
  // console.log('clearing storage...')
  const killTx = await api.tx.sudo.sudo(api.tx.system.killStorage(prefix2Remove));

  await new Promise((resolve, reject) => {
    killTx.signAndSend(sudoPair, (result) => {
      (result.status.isInBlock || result.status.isFinalized) && resolve(result.txHash.toHex());
      // : reject('something is wrong');
    });
  });
  // }

  console.log('setting snapshot, length: ', snapshot.length);
  const tx = await api.tx.sudo.sudo(api.tx.system.setStorage(snapshot));

  return await new Promise((resolve, reject) => {
    // only alice can do it, not bob...
    tx.signAndSend(sudoPair, (result) => {
      (result.status.isInBlock || result.status.isFinalized) && resolve(result.txHash.toHex());
    });
  });
};

(async () => {
  const wsProvider = new WsProvider('ws://localhost:9944');
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;

  process.stdin.on('data', async (_data) => {
    const cmd = _data.toString().trim();

    switch (cmd) {
      case '1':
      case 'snapshot': {
        const id = await snapshot(api);
        console.log('snapshot finished!', id);
        break;
      }

      case '2':
      case 'revert': {
        try {
          const txHash = await revert(api);
          console.log('revert finished!', txHash);
        } catch (error) {
          console.log(error);
        }
        break;
      }

      default: {
        // await api.disconnect();
        // process.exit(0);
      }
    }
  });
})();
