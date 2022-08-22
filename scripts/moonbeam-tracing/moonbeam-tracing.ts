import axios from 'axios';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Interface } from 'ethers/lib/utils';
import { getErc20Info, MOONBEAM_RPC, rpcPost, runWithRetries } from '../utils';
import { getAllMoonbeamTx, TxTypes, Tx } from './utils';
import ERC20_ABI from '../ERC20_ABI.json';
import { BigNumber, Contract } from 'ethers';
import { csvWriter } from './writer';
import { ERC20_TRANSFER_TOPIC_SIG, maliciousAddresses, ONE_ETHER } from './consts';

const ACALA_START_BLOCK = 1638215;
const ACALA_END_BLOCK = 1639493;
const MOONBEAM_START_BLOCK = ACALA_START_BLOCK + 8500;
const MOONBEAM_END_BLOCK = ACALA_END_BLOCK + 8500;

const provider = new JsonRpcProvider(MOONBEAM_RPC);
// const eth_call = rpcPost('eth_call', MOONBEAM_RPC);

const getAllData = async (address: string): Promise<ReturnType<Tx['toJson']>[]> => {
  const curBlock = await provider.getBlockNumber();
  const allTx = await getAllMoonbeamTx(address, MOONBEAM_START_BLOCK, curBlock);

  return Promise.all(
    allTx
      .filter((tx) => tx.succeed())
      .map(async (tx) =>
        runWithRetries(async () => {
          // console.log(tx.type, tx.type === TxTypes.xcm);
          tx.type === TxTypes.sendToken && (await tx.getTokenInfo(provider));
          tx.type === TxTypes.swap && (await tx.getErc20Transfers(provider));
          tx.type === TxTypes.xcm && (await tx.getXcmInfo(provider));

          return tx.toJson();
        })
      )
  );
};

const main = async () => {
  for (const addr of maliciousAddresses) {
    // if (addr !== '0x57f73c4bff8ebe0fdd91c666fd304804d50fc218') continue;

    console.log(`checking ${addr} ...`);
    const data = await getAllData(addr);

    console.log(`writing ${data.length} data ...`);
    await csvWriter.writeRecords(data);
    await csvWriter.writeRecords({});
    await csvWriter.writeRecords({});
    await csvWriter.writeRecords({});
    console.log('OK ✔️');
    console.log('');
  }

  // console.log(finalRes)
  // allInfo.forEach(console.log)
  // console.log(JSON.stringify(allInfo, null, 2));
};

main().then(
  () => process.exit(0),
  (e) => {
    console.log(e);
    process.exit(1);
  }
);
