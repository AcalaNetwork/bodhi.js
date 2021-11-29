const HelloWorld = artifacts.require('HelloWorld');

module.exports = async function (deployer) {
  console.log('Deploying HelloWorld');

  await deployer.deploy(HelloWorld);

  console.log('HelloWorld deployed at:', HelloWorld.address);
};
