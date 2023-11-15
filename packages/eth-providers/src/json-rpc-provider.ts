import { BigNumber, Transaction, logger } from 'ethers';
import { ConnectionInfo, Logger, hexDataLength, hexlify } from 'ethers/lib/utils';
import { JsonRpcProvider, Networkish, TransactionReceipt, TransactionResponse } from '@ethersproject/providers';

export class AcalaJsonRpcProvider extends JsonRpcProvider {
  constructor(url: ConnectionInfo | string, network?: Networkish) {
    super(url, network);
  }

  /* ---------------
     override underlying _wrapTransaction to avoid tx hash check
     sendTransaction doesn't need it, just in case other methods call it
                                                         --------------- */
  _wrapTransaction(tx: Transaction, hash?: string, startBlock?: number): TransactionResponse {
    if (hash != null && hexDataLength(hash) !== 32) { throw new Error('invalid response - sendTransaction'); }

    const result = <TransactionResponse>tx;

    // Check the hash we expect is the same as the hash the server reported
    if (hash != null && tx.hash !== hash) {
      // don't care ¯\_(ツ)_/¯
    }

    result.wait = async (confirms?: number, timeout?: number) => {
      if (confirms == null) { confirms = 1; }
      if (timeout == null) { timeout = 0; }

      // Get the details to detect replacement
      let replacement = undefined;
      if (confirms !== 0 && startBlock != null) {
        replacement = {
          data: tx.data,
          from: tx.from,
          nonce: tx.nonce,
          to: tx.to,
          value: tx.value,
          startBlock,
        };
      }

      const receipt = await this._waitForTransaction(tx.hash, confirms, timeout, replacement);
      if (receipt == null && confirms === 0) { return null; }

      // No longer pending, allow the polling loop to garbage collect this
      this._emitted['t:' + tx.hash] = receipt.blockNumber;

      if (receipt.status === 0) {
        logger.throwError('transaction failed', Logger.errors.CALL_EXCEPTION, {
          transactionHash: tx.hash,
          transaction: tx,
          receipt: receipt,
        });
      }
      return receipt;
    };

    return result;
  }

  // override the underlying _wrapTransaction to avoid tx replacement check
  async _waitForTransaction(transactionHash: string, confirmations: number, timeout: number, replaceable: { data: string, from: string, nonce: number, to: string, value: BigNumber, startBlock: number }): Promise<TransactionReceipt> {
    const receipt = await this.getTransactionReceipt(transactionHash);

    // Receipt is already good
    if ((receipt ? receipt.confirmations : 0) >= confirmations) { return receipt; }

    // Poll until the receipt is good...
    return new Promise((resolve, reject) => {
      const cancelFuncs: Array<() => void> = [];

      let done = false;
      const alreadyDone = function () {
        if (done) { return true; }
        done = true;
        cancelFuncs.forEach(func => { func(); });
        return false;
      };

      const minedHandler = (receipt: TransactionReceipt) => {
        if (receipt.confirmations < confirmations) { return; }
        if (alreadyDone()) { return; }
        resolve(receipt);
      };

      this.on(transactionHash, minedHandler);
      cancelFuncs.push(() => { this.removeListener(transactionHash, minedHandler); });

      if (replaceable) {
        // don't care ¯\_(ツ)_/¯
      }

      if (typeof (timeout) === 'number' && timeout > 0) {
        const timer = setTimeout(() => {
          if (alreadyDone()) { return; }
          reject(logger.makeError('timeout exceeded', Logger.errors.TIMEOUT, { timeout: timeout }));
        }, timeout);
        if (timer.unref) { timer.unref(); }

        cancelFuncs.push(() => { clearTimeout(timer); });
      }
    });
  }

  async sendTransaction(signedTransaction: string | Promise<string>): Promise<TransactionResponse> {
    await this.getNetwork();
    const hexTx = await Promise.resolve(signedTransaction).then(t => hexlify(t));
    const tx = this.formatter.transaction(signedTransaction);
    if (tx.confirmations == null) { tx.confirmations = 0; }
    const blockNumber = await this._getInternalBlockNumber(100 + 2 * this.pollingInterval);
    try {
      const realHash = await this.perform('sendTransaction', { signedTransaction: hexTx });
      tx.hash = realHash;     // override the auto computed "wrong" hash with real one
      return this._wrapTransaction(tx, realHash, blockNumber);
    } catch (error) {
      (<any>error).transaction = tx;
      (<any>error).transactionHash = tx.hash;
      throw error;
    }
  }
}
