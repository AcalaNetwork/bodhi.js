import type { providers } from 'ethers';

export function supportEmit(Assertion: Chai.AssertionStatic): void {
  const filterLogsWithTopics = (logs: providers.Log[], topic: any, contractAddress: string) =>
    logs
      .filter((log) => log.topics.includes(topic))
      .filter((log) => log.address && log.address.toLowerCase() === contractAddress.toLowerCase());

  Assertion.addMethod('emit', function (contract, eventName) {
    const promise = this._obj;
    const derivedPromise = promise
      .then((tx: any) => tx.wait())
      .then((receipt: providers.TransactionReceipt) => {
        let eventFragment;
        try {
          eventFragment = contract.interface.getEvent(eventName);
        } catch (e) {
          // ignore error
        }

        if (eventFragment === undefined) {
          const isNegated = (this as any).__flags.negate === true;
          this.assert(
            isNegated,
            `Expected event "${eventName}" to be emitted, but it doesn't` +
              ' exist in the contract. Please make sure you\'ve compiled' +
              ' its latest version before running the test.',
            `WARNING: Expected event "${eventName}" NOT to be emitted.` +
              ' The event wasn\'t emitted because it doesn\'t' +
              ' exist in the contract. Please make sure you\'ve compiled' +
              ' its latest version before running the test.',
            eventName,
            ''
          );
          return;
        }
        const topic = contract.interface.getEventTopic(eventFragment);
        (this as any).logs = filterLogsWithTopics(receipt.logs, topic, contract.address);
        (this as any).assert(
          (this as any).logs.length > 0,
          `Expected event "${eventName}" to be emitted, but it wasn't`,
          `Expected event "${eventName}" NOT to be emitted, but it was`
        );
      });
    (this as any).then = derivedPromise.then.bind(derivedPromise);
    (this as any).catch = derivedPromise.catch.bind(derivedPromise);
    (this as any).promise = derivedPromise;
    (this as any).contract = contract;
    (this as any).eventName = eventName;
    return this;
  });

  const assertArgsArraysEqual = (context: any, expectedArgs: any[], log: any[]) => {
    const actualArgs = context.contract.interface.parseLog(log).args;
    context.assert(
      actualArgs.length === expectedArgs.length,
      `Expected "${context.eventName}" event to have ${expectedArgs.length} argument(s), ` +
        `but it has ${actualArgs.length}`,
      'Do not combine .not. with .withArgs()',
      expectedArgs.length,
      actualArgs.length
    );
    for (let index = 0; index < expectedArgs.length; index++) {
      if (expectedArgs[index].length !== undefined && typeof expectedArgs[index] !== 'string') {
        for (let j = 0; j < expectedArgs[index].length; j++) {
          new Assertion(actualArgs[index][j]).equal(expectedArgs[index][j]);
        }
      } else {
        new Assertion(actualArgs[index]).equal(expectedArgs[index]);
      }
    }
  };

  const tryAssertArgsArraysEqual = (context: any, expectedArgs: any[], logs: any[]) => {
    if (logs.length === 1) return assertArgsArraysEqual(context, expectedArgs, logs[0]);
    for (const log of logs) {
      try {
        assertArgsArraysEqual(context, expectedArgs, log);
        return;
      } catch {
        // ignore
      }
    }
    context.assert(
      false,
      `Specified args not emitted in any of ${context.logs.length} emitted "${context.eventName}" events`,
      'Do not combine .not. with .withArgs()'
    );
  };
  Assertion.addMethod('withArgs', function (...expectedArgs) {
    const derivedPromise = (this as any).promise.then(() => {
      tryAssertArgsArraysEqual(this, expectedArgs, (this as any).logs);
    });
    (this as any).then = derivedPromise.then.bind(derivedPromise);
    (this as any).catch = derivedPromise.catch.bind(derivedPromise);
    return this;
  });
}
