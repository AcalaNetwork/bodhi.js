import { hexValue } from '@ethersproject/bytes';
import EventEmitter from 'events';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { hexlifyRpcResult } from './utils';
import { MethodNotFound } from './errors';
import { validate } from './validate';

export class Eip1193Bridge extends EventEmitter {
  readonly #impl: Eip1193BridgeImpl;

  constructor(provider: EvmRpcProvider) {
    super();
    this.#impl = new Eip1193BridgeImpl(provider);
  }

  request(request: { method: string; params?: Array<any> }): Promise<any> {
    return this.send(request.method, request.params || []);
  }

  isMethodValid(method: string): boolean {
    return method.startsWith('eth_') || method.startsWith('net_') || method.startsWith('web3_');
  }

  isMethodImplemented(method: string): method is keyof Eip1193BridgeImpl {
    return this.isMethodValid(method) && method in this.#impl;
  }

  async send(method: string, params: any[] = []): Promise<any> {
    if (this.isMethodImplemented(method)) {
      // isMethodImplemented ensuress this cannot be used to access other unrelated methods
      return this.#impl[method](params);
    }

    throw new MethodNotFound('Method not available', `The method ${method} is not available.`);
  }
}

class Eip1193BridgeImpl {
  readonly #provider: EvmRpcProvider;

  constructor(provider: EvmRpcProvider) {
    this.#provider = provider;
  }

  async web3_clientVersion(): Promise<string> {
    return 'Acala/v0.0.1';
  }

  /**
   * Returns the current network id.
   * @returns ID - The current network id.
   */
  async net_version(params: any[]): Promise<any> {
    validate([], params);
    return this.#provider.netVersion();
  }

  /**
   * Returns the current "latest" block number.
   * @returns BLOCK NUMBER - a hex code of an integer representing the current block number the client is on.
   */
  async eth_blockNumber(params: any[]): Promise<any> {
    validate([], params);
    const number = await this.#provider.getBlockNumber();
    return hexValue(number);
  }

  /**
   * Returns the currently configured chain id, a value used in replay-protected transaction signing as introduced by EIP-155.
   * @returns QUANTITY - big integer of the current chain id.
   */
  async eth_chainId(params: any[]) {
    validate([], params);
    const chainId = await this.#provider.chainId();
    return hexValue(chainId);
  }

  /**
   * Returns the number of transactions sent from an address.
   * @param ADDRESS [required] - a string representing the address (20 bytes) to check for transaction count for
   * @param BLOCKTAG [required] - default block parameter
   * @returns TRANSACTION COUNT - a hex code of the integer representing the number of transactions sent from this address.
   */
  async eth_getTransactionCount(params: any[]): Promise<string> {
    validate([{ type: 'address' }, { type: 'block' }], params);
    const count = await this.#provider.getTransactionCount(params[0], params[1]);
    return hexValue(count);
  }

  /**
   * Returns the compiled smart contract code, if any, at a given address.
   * @param ADDRESS [required] - a string representing the address (20 bytes) of the code
   * @param BLOCKTAG [required] - default block parameter
   * @returns CODE - a hex of the code at the given address
   */
  async eth_getCode(params: any[]): Promise<string> {
    validate([{ type: 'address' }, { type: 'block' }], params);
    return this.#provider.getCode(params[0], params[1]);
  }

  /**
   * Executes a new message call immediately without creating a transaction on the block chain.
   * @param TRANSACTION CALL OBJECT [required]
   * @param BLOCKTAG [required] - default block parameter
   * @returns RETURN VALUE - the return value of the executed contract method.
   */
  async eth_call(params: any[]): Promise<string> {
    validate([{ type: 'transaction' }, { type: 'block' }], params);
    return this.#provider.call(params[0], params[1]);
  }

  /**
   * Returns the balance of the account of given address.
   * @param ADDRESS [required] - a string representing the address (20 bytes) to check for balance
   * @param BLOCKTAG [required] - default block parameter
   * @returns BALANCE - integer of the current balance in wei.
   */
  async eth_getBalance(params: any[]): Promise<string> {
    validate([{ type: 'address' }, { type: 'block' }], params);
    const balance = await this.#provider.getBalance(params[0], params[1]);
    return hexlifyRpcResult(balance);
  }

  /**
   * Returns information about a block by hash.
   * @param BLOCKHASH [required] - a string representing the hash (32 bytes) of a block
   * @param SHOW TRANSACTION DETAILS FLAG [required] - if set to true, it returns the full transaction objects, if false only the hashes of the transactions.
   * @returns BLOCK - A block object, or null when no block was found
   */
  async eth_getBlockByHash(params: any[]): Promise<any> {
    validate([{ type: 'blockHash' }, { type: 'flag' }], params);
    const block = await this.#provider.getBlock(params[0], params[1]);
    return hexlifyRpcResult(block);
  }

  /**
   * Returns information about a block by hash.
   * @param BLOCKTAG [required] - default block parameter
   * @param SHOW TRANSACTION DETAILS FLAG [required] - if set to true, it returns the full transaction objects, if false only the hashes of the transactions.
   * @returns BLOCK - A block object, or null when no block was found
   */
  async eth_getBlockByNumber(params: any[]): Promise<any> {
    validate([{ type: 'block' }, { type: 'flag' }], params);
    const block = await this.#provider.getBlock(params[0], params[1]);
    return hexlifyRpcResult(block);
  }

  /**
   * Returns the current gas price in wei.
   * @returns GAS PRICE - a hex code of an integer representing the current gas price in wei.
   */
  // async eth_gasPrice(params: any[]): Promise<any> {

  // }

  // async eth_accounts(params: any[]): Promise<any> {

  // }

  /**
   * Returns the value from a storage position at a given address.
   * @param ADDRESS [required] - a string representing the address (20 bytes) of the storage
   * @param STORAGE POSITION [required] - a hex code of the position in the storage
   * @param BLOCKTAG [required] - default block parameter
   * @returns STORAGE VALUE - a hex code of the integer indicating the value of the storage position at the provided address
   */
  async eth_getStorageAt(params: any[]): Promise<string> {
    validate([{ type: 'address' }, { type: 'position' }, { type: 'block' }], params);
    return this.#provider.getStorageAt(params[0], params[1], params[2]);
  }

  /**
   * Returns the number of transactions in the block with the given block hash.
   * @param BLOCKHASH [required] - a string representing the hash (32 bytes) of a block
   * @returns BLOCK TRANSACTION COUNT - a hex code of the integer representing the number of transactions in the provided block
   */
  async eth_getBlockTransactionCountByHash(params: any[]): Promise<string> {
    validate([{ type: 'blockHash' }], params);
    const result = await this.#provider.getBlock(params[0]);
    return hexValue(result.transactions.length);
  }

  /**
   * Returns the number of transactions in the block with the given block number.
   * @param BLOCKTAG [required] - default block parameter
   * @returns BLOCK TRANSACTION COUNT - a hex code of the integer representing the number of transactions in the provided block
   */
  async eth_getBlockTransactionCountByNumber(params: any[]): Promise<string> {
    validate([{ type: 'block' }], params);
    const result = await this.#provider.getBlock(params[0]);
    return hexValue(result.transactions.length);
  }

  /**
   * Submits a pre-signed transaction for broadcast to the Ethereum network.
   * @param TRANSACTION DATA [required] - The signed transaction data.
   * @returns TRANSACTION HASH - 32 Bytes - the transaction hash, or the zero hash if the transaction is not yet available
   */
  async eth_sendRawTransaction(params: any[]): Promise<string> {
    validate([{ type: 'transactionData' }], params);
    return this.#provider.sendRawTransaction(params[0]);
  }

  /**
   * Generates and returns an estimate of how much gas is necessary to allow the transaction to complete. The transaction will not be added to the blockchain. Note that the estimate may be significantly more than the amount of gas actually used by the transaction, for a variety of reasons including EVM mechanics and node performance.
   * @param TRANSACTION CALL OBJECT [required]
   * @returns GAS USED - the amount of gas used.
   */
  async eth_estimateGas(params: any[]): Promise<string> {
    validate([{ type: 'transaction' }], params);
    // @TODO
    return '0x11ffff';
  }

  // async eth_getTransactionByHash(params: any[]): Promise<any> {

  // }

  // async eth_getTransactionReceipt(params: any[]): Promise<any> {

  // }

  // async eth_sign(params: any[]): Promise<any> {

  // }

  // async eth_sendTransaction(params: any[]): Promise<any> {

  // }

  // async eth_getUncleCountByBlockHash(params: any[]): Promise<any> {

  // }

  // async eth_getUncleCountByBlockNumber(params: any[]): Promise<any> {

  // }

  // async eth_getTransactionByBlockHashAndIndex(params: any[]): Promise<any> {

  // }

  // async eth_getTransactionByBlockNumberAndIndex(params: any[]): Promise<any> {

  // }

  // async eth_getUncleByBlockHashAndIndex(params: any[]): Promise<any> {

  // }

  // async eth_getUncleByBlockNumberAndIndex(params: any[]): Promise<any> {

  // }

  // async eth_newFilter(params: any[]): Promise<any> {

  // }

  // async eth_newBlockFilter(params: any[]): Promise<any> {

  // }

  // async eth_newPendingTransactionFilter(params: any[]): Promise<any> {

  // }

  // async eth_uninstallFilter(params: any[]): Promise<any> {

  // }

  // async eth_getFilterChanges(params: any[]): Promise<any> {

  // }

  // async eth_getFilterLogs(params: any[]): Promise<any> {

  // }

  // async eth_getLogs(params: any[]): Promise<any> {

  // }
}
