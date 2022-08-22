import { TransactionReceipt, Log, JsonRpcProvider } from '@ethersproject/providers';
import axios from 'axios';
import { BigNumber, Contract } from 'ethers';
import { Interface } from 'ethers/lib/utils';
import ERC20_ABI from '../ERC20_ABI.json';
import { getErc20Info } from '../utils';
import { ERC20_TRANSFER_TOPIC_SIG, ONE_ETHER, XTOKEN_ABI } from './consts';

export interface BlockscoutTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: '1' | '0';
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

export enum TxTypes {
  swap = 'swap',
  sendToken = 'send token',
  transfer = 'transfer GLMR',
  xcm = 'xcm'
}

interface ERC20Transfer {
  from: string;
  to: string;
  tokenName: string;
  tokenSymbol: string;
  decimals: string;
  amount: string;
}

export const ERC20_TRANSFER = 'transfer(address dst, uint256 wad)';
export const XTOKEN_ADDRESS = '0x0000000000000000000000000000000000000804';

const getTransferInfoFromLog = async (log: Log, provider: JsonRpcProvider): Promise<ERC20Transfer> => {
  const { address, topics, data } = log;
  const [, from, to] = topics;
  const { tokenName, tokenSymbol, decimals } = await getErc20Info(address, provider);

  return {
    from,
    to,
    tokenName,
    tokenSymbol,
    decimals,
    amount: BigNumber.from(data)
      .div(BigNumber.from(BigNumber.from(10).pow(decimals)))
      .toString()
  };
};

export class Tx {
  blockNumber: string;
  hash: string;
  nonce: string;
  from: string;
  to: string;
  input: string;
  methodId: string;
  functionName: string;
  receipt: TransactionReceipt;

  value: BigNumber;
  status: '0' | '1';

  type: TxTypes | string;
  important: boolean;

  // erc20 transfer
  tokenName: string;
  tokenSymbol: string;
  destination: string;
  amount: string;

  // swap
  erc20Transfers: ERC20Transfer[];

  // xcm
  xcmToken: string;
  xcmAmount: string;

  constructor(data: BlockscoutTx) {
    this.blockNumber = data.blockNumber;
    this.hash = data.hash;
    this.nonce = data.nonce;
    this.from = data.from;
    this.to = data.to;
    this.input = data.input;
    this.methodId = data.methodId;
    this.functionName = data.functionName;

    this.value = BigNumber.from(data.value).div(ONE_ETHER);
    this.status = data.txreceipt_status;

    this.erc20Transfers = [];

    this.checkTxType();
  }

  succeed() {
    return this.status === '1';
  }

  checkTxType() {
    this.important = true;

    if (this.functionName === ERC20_TRANSFER) {
      this.type = TxTypes.sendToken;
    } else if (this.functionName.includes('swap')) {
      this.type = TxTypes.swap;
    } else if (this.functionName === '' && this.value.gt(0)) {
      this.type = TxTypes.transfer;
    } else if (this.to === XTOKEN_ADDRESS) {
      this.type = TxTypes.xcm;
    } else {
      this.type = this.functionName !== '' ? this.functionName.split('(')[0] : '???';
      this.important = false;
    }
  }

  // get all info needed for token transfer tx
  async getTokenInfo(provider: JsonRpcProvider): Promise<void> {
    const { tokenName, tokenSymbol, decimals } = await getErc20Info(this.to, provider);
    this.tokenName = tokenName;
    this.tokenSymbol = tokenSymbol;

    const iFace = new Interface(ERC20_ABI);
    const [destination, rawAmount] = iFace.decodeFunctionData(ERC20_TRANSFER, this.input);
    this.destination = destination;
    this.amount = rawAmount.div(BigNumber.from(10).pow(decimals)).toString();
  }

  async getReceipt(provider: JsonRpcProvider): Promise<void> {
    this.receipt = await provider.getTransactionReceipt(this.hash);
  }

  // get all erc20 transfers in a dex swap tx
  async getErc20Transfers(provider: JsonRpcProvider): Promise<void> {
    !this.receipt && (await this.getReceipt(provider));

    const transferLogs = this.receipt.logs.filter((log) => log.topics[0] === ERC20_TRANSFER_TOPIC_SIG);

    this.erc20Transfers = await Promise.all(transferLogs.map(async (log) => getTransferInfoFromLog(log, provider)));
  }

  async getXcmInfo(provider: JsonRpcProvider): Promise<void> {
    const xtoken = new Contract(XTOKEN_ADDRESS, XTOKEN_ABI, provider);
    const [tokenAddr, rawAmount] = xtoken.interface.decodeFunctionData('transfer', this.input);
    const { tokenSymbol, decimals } = await getErc20Info(tokenAddr, provider);
    const amount = rawAmount.div(BigNumber.from(10).pow(decimals));

    this.xcmToken = tokenSymbol;
    this.xcmAmount = amount.toString();
  }

  getExplain() {
    switch (this.type) {
      case TxTypes.transfer:
        return `transfer ${this.value} GLMR to ${this.to.substring(0, 6)}`;

      case TxTypes.sendToken:
        return `send ${this.amount} ${this.tokenSymbol} to ${this.destination.substring(0, 6)}`;

      case TxTypes.swap:
        return `swap ${this.erc20Transfers[0]?.amount} ${this.erc20Transfers[0]?.tokenSymbol} to ${
          this.erc20Transfers[this.erc20Transfers.length - 1]?.amount
        } ${this.erc20Transfers[this.erc20Transfers.length - 1]?.tokenSymbol}`;

      case TxTypes.xcm:
        return `xcm ${this.xcmAmount} ${this.xcmToken}`;

      default:
        return '/';
      // return 'unknown/unimportant operation';
    }
  }

  toJson() {
    return {
      blockNumber: this.blockNumber,
      hash: this.hash,
      from: this.from,
      to: this.to,
      value: this.value,
      action: this.type,
      important: this.important ? 'yes' : '',
      // transfer
      tokenName: this.tokenName,
      tokenSymbol: this.tokenSymbol,
      amount: this.amount,
      destination: this.destination,
      // swap
      tokenIn: this.erc20Transfers[0]?.tokenSymbol,
      tokenInAmount: this.erc20Transfers[0]?.amount,
      tokenInDecimals: this.erc20Transfers[0]?.decimals,
      tokenOut: this.erc20Transfers[this.erc20Transfers.length - 1]?.tokenSymbol,
      tokenOutAmount: this.erc20Transfers[this.erc20Transfers.length - 1]?.amount,
      tokenOutDecimals: this.erc20Transfers[this.erc20Transfers.length - 1]?.decimals,
      //xcm
      xcmToken: this.xcmToken,
      xcmAmount: this.xcmAmount,
      // explain
      explain: this.getExplain()
    };
  }
}

export const getAllMoonbeamTx = async (address: string, startBlock: number, endBlock: number): Promise<Tx[]> => {
  const res = await axios.get(
    `https://api-moonbeam.moonscan.io/api?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=asc&apikey=1QS5VH2CHXPYV5AI8EAQHMR8BWW3DPDV73`
  );

  if (res.data.status !== '1' && res.data.message !== 'No transactions found') {
    console.log(res);
    throw new Error('getAllMoonbeamTx failed ...');
  }

  return res.data.result.map((data) => new Tx(data));
};
