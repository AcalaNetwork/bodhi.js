const HelloWorld = artifacts.require('HelloWorld');

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
    const helloWorld = await instance.helloWorld();

    expect(helloWorld).to.equal('Hello World!');
  });
});
