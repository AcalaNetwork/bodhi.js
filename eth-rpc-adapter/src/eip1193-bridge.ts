import { EvmRpcProvider, TX, TXReceipt, hexlifyRpcResult } from '@acala-network/eth-providers';
import { PROVIDER_ERRORS } from '@acala-network/eth-providers/lib/utils';
import { Log, TransactionReceipt } from '@ethersproject/abstract-provider';
import { Signer } from '@ethersproject/abstract-signer';
import { getAddress } from '@ethersproject/address';
import { hexValue } from '@ethersproject/bytes';
import EventEmitter from 'events';
import { InvalidParams, MethodNotFound } from './errors';
import { validate } from './validate';

const HEX_ZERO = '0x0';
export class Eip1193Bridge extends EventEmitter {
  readonly #impl: Eip1193BridgeImpl;

  constructor(provider: EvmRpcProvider, signer?: Signer) {
    super();
    this.#impl = new Eip1193BridgeImpl(provider, signer);
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

  async send(method: string, params: any[] = [], cb?: any): Promise<any> {
    if (this.isMethodImplemented(method)) {
      // isMethodImplemented ensuress this cannot be used to access other unrelated methods
      return this.#impl[method](params, cb);
    }

    throw new MethodNotFound('Method not available', `The method ${method} is not available.`);
  }
}

class Eip1193BridgeImpl {
  readonly #provider: EvmRpcProvider;
  readonly #signer?: Signer;

  constructor(provider: EvmRpcProvider, signer?: Signer) {
    this.#provider = provider;
    this.#signer = signer;
  }

  async web3_clientVersion(): Promise<string> {
    return 'Acala/v0.0.1';
  }

  // Query the synchronization progress and version information of indexer
  async net_indexer(params: any[]): Promise<any> {
    validate([], params);
    return this.#provider.getIndexerMetadata();
  }

  // query unfinalized cache info for dev debugging use
  async net_cacheInfo(params: any[]): Promise<any> {
    validate([], params);
    return this.#provider.getUnfinalizedCachInfo();
  }

  async net_isSafeMode(params: any[]): Promise<any> {
    validate([], params);
    return this.#provider.isSafeMode;
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
  async eth_chainId(params: any[]): Promise<string> {
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
    try {
      const block = await this.#provider.getBlock(params[0], params[1]);
      return hexlifyRpcResult(block);
    } catch (error) {
      if (
        typeof error === 'object' &&
        ((error as any).code === PROVIDER_ERRORS.HEADER_NOT_FOUND ||
          error!.toString().includes('Unable to retrieve header'))
      ) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Returns information about a block by hash.
   * @param BLOCKTAG [required] - default block parameter
   * @param SHOW TRANSACTION DETAILS FLAG [required] - if set to true, it returns the full transaction objects, if false only the hashes of the transactions.
   * @returns BLOCK - A block object, or null when no block was found
   */
  async eth_getBlockByNumber(params: any[]): Promise<any> {
    validate([{ type: 'block' }, { type: 'flag' }], params);
    try {
      const block = await this.#provider.getBlock(params[0], params[1]);
      return hexlifyRpcResult(block);
    } catch (error) {
      if (
        typeof error === 'object' &&
        ((error as any).code === PROVIDER_ERRORS.HEADER_NOT_FOUND ||
          error!.toString().includes('Unable to retrieve header'))
      ) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Returns the current gas price in wei.
   * @returns GAS PRICE - a hex code of an integer representing the current gas price in wei.
   */
  async eth_gasPrice(params: any[]): Promise<string> {
    validate([], params);
    const gasPrice = await this.#provider.getGasPrice();
    return hexValue(gasPrice);
  }

  /**
   * Returns a list of addresses owned by client.
   * @returns 20 Bytes - addresses owned by the client.
   */
  async eth_accounts(params: any[]): Promise<any> {
    validate([], params);
    const result = [];
    if (this.#signer) {
      const address = await this.#signer.getAddress();
      result.push(address);
    }
    return result;
  }

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
    const val = await this.#provider.estimateGas(params[0]);
    return hexValue(val);
  }

  async eth_getEthGas(params: any[]): Promise<{
    gasPrice: string;
    gasLimit: string;
  }> {
    validate([{ type: 'substrateGasParams?' }], params);

    const res = await this.#provider._getEthGas(params[0]);

    return {
      gasPrice: hexValue(res.gasPrice),
      gasLimit: hexValue(res.gasLimit)
    };
  }

  async _runWithRetries<T>(fn: any, args: any[] = [], maxRetries: number = 20, interval: number = 1000): Promise<T> {
    let res;
    let tries = 0;

    while (!res && tries++ < maxRetries) {
      try {
        res = await fn(...args);
      } catch (e) {
        console.log(`failed attemp # ${tries}/${maxRetries}`);
        if (tries === maxRetries || !(e as any).message.includes('transaction hash not found')) {
          throw e;
        }
        await sleep(interval);
      }
    }

    return res as T;
  }

  /**
   * Returns the information about a transaction requested by transaction hash.
   * @param DATA, 32 Bytes - hash of a transaction
   * @returns Transaction, A transaction object, or null when no transaction was found:
   */
  async eth_getTransactionByHash(params: any[]): Promise<TX> {
    validate([{ type: 'blockHash' }], params);

    const res = await this._runWithRetries<TX>(this.#provider.getTransactionByHash, params);
    return hexlifyRpcResult(res);
  }

  /**
   * Returns the receipt of a transaction by transaction hash. Note That the receipt is not available for pending transactions.
   * @param DATA, 32 Bytes - hash of a transaction
   * @returns TransactionReceipt, A transaction receipt object, or null when no receipt was found:
   */
  async eth_getTransactionReceipt(params: any[]): Promise<TransactionReceipt> {
    validate([{ type: 'blockHash' }], params);

    const res = await this._runWithRetries<TXReceipt>(this.#provider.getTXReceiptByHash, params);
    // @ts-ignore
    delete res.byzantium;
    // @ts-ignore
    delete res.confirmations;
    return hexlifyRpcResult(res);
  }

  /**
   * The sign method calculates an Ethereum specific signature with: sign(keccak256("\x19Ethereum Signed Message:\n" + len(message) + message))).
   * By adding a prefix to the message makes the calculated signature recognisable as an Ethereum specific signature. This prevents misuse where a malicious DApp can sign arbitrary data (e.g. transaction) and use the signature to impersonate the victim.
   * Note the address to sign with must be unlocked.
   * @param ADDRESS, 20 Bytes - address
   * @param MESSAGE, N Bytes - message to sign
   * @returns Signature
   */
  async eth_sign(params: any[]): Promise<any> {
    validate([{ type: 'address' }, { type: 'message' }], params);

    if (!this.#signer) {
      throw new Error('eth_sign requires an account');
    }

    const address = await this.#signer.getAddress();

    if (address !== getAddress(params[0])) {
      throw new InvalidParams('account mismatch or account not found', params[0]);
    }

    return this.#signer.signMessage(params[1]);
  }

  /**
   * Creates new message call transaction or a contract creation, if the data field contains code.
   * @param params
   * @returns TransactionHash - the transaction hash, or the zero hash if the transaction is not yet available.
   */
  async eth_sendTransaction(params: any[]): Promise<any> {
    if (!this.#signer) {
      throw new Error('eth_sendTransaction requires an account');
    }

    const tx = await this.#signer.sendTransaction(params[0]);
    return tx.hash;
  }

  async eth_getTransactionByBlockHashAndIndex(params: any[]): Promise<any> {
    validate([{ type: 'blockHash' }, { type: 'hexNumber' }], params);

    const res = await this.#provider.getTransactionReceiptAtBlock(params[1], params[0]);
    return hexlifyRpcResult(res);
  }

  async eth_getTransactionByBlockNumberAndIndex(params: any[]): Promise<any> {
    validate([{ type: 'block' }, { type: 'hexNumber' }], params);

    const res = await this.#provider.getTransactionReceiptAtBlock(params[1], params[0]);
    return hexlifyRpcResult(res);
  }

  async eth_getUncleCountByBlockHash(params: any[]): Promise<any> {
    validate([{ type: 'blockHash' }], params);

    return HEX_ZERO;
  }

  async eth_getUncleCountByBlockNumber(params: any[]): Promise<any> {
    validate([{ type: 'block' }], params);

    return HEX_ZERO;
  }

  async eth_getUncleByBlockHashAndIndex(params: any[]): Promise<any> {
    validate([{ type: 'blockHash' }, { type: 'hexNumber' }], params);

    return null;
  }

  async eth_getUncleByBlockNumberAndIndex(params: any[]): Promise<any> {
    validate([{ type: 'block' }, { type: 'hexNumber' }], params);

    return null;
  }

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

  async eth_getLogs(params: any[]): Promise<Log[]> {
    validate([{ type: 'object' }], params);
    const result = await this.#provider.getLogs(params[0]);
    return hexlifyRpcResult(result);
  }

  async eth_subscribe(params: any[], cb: any): Promise<any> {
    validate([{ type: 'eventName' }, { type: 'object?' }], params);
    return this.#provider.addEventListener(params[0], cb, params[1]);
  }

  async eth_unsubscribe(params: any[], cb: any): Promise<any> {
    validate([{ type: 'address' }], params);
    return this.#provider.removeEventListener(params[0]);
  }
}
