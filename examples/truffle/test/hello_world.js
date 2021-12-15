const HelloWorld = artifacts.require('HelloWorld');

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract('HelloWorld', function (/* accounts */) {
  let instance;

  before('setup development environment', async function () {
    instance = await HelloWorld.deployed();
    return assert.isTrue(true);
  });

  it('should assert true', async function () {
    console.log(instance.address);
  });

  it('returns the right value after the contract is deployed', async function () {
    const hello_world = await instance.helloWorld();

    expect(hello_world).to.equal('Hello W');
  });
});
