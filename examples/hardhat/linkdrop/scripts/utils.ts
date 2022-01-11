import { utils } from 'ethers';
const ethers = require('ethers');

function buildCreate2Address(creatorAddress, saltHex, byteCode) {
  const byteCodeHash = utils.keccak256(byteCode);
  return `0x${utils
    .keccak256(`0x${['ff', creatorAddress, saltHex, byteCodeHash].map((x) => x.replace(/0x/, '')).join('')}`)
    .slice(-40)}`.toLowerCase();
}

export const computeBytecode = (masterCopyAddress) => {
  const bytecode = `0x363d3d373d3d3d363d73${masterCopyAddress.slice(2)}5af43d82803e903d91602b57fd5bf3`;
  return bytecode;
};

// const initcode = '0x6352c7420d6000526103ff60206004601c335afa6040516060f3'

export const computeProxyAddress = (factoryAddress, linkdropMasterAddress, campaignId, initcode) => {
  const salt = utils.solidityKeccak256(['address', 'uint256'], [linkdropMasterAddress, campaignId]);
  // const bytecode = computePendingRuntimeCode(masterCopyAddress)
  const proxyAddress = buildCreate2Address(factoryAddress, salt, initcode);
  return proxyAddress;
};

// Should be signed by linkdrop master (sender)
export const signLink = async (
  linkdropSigner, // Wallet
  ethAmount,
  tokenAddress,
  tokenAmount,
  expirationTime,
  version,
  chainId,
  linkId,
  proxyAddress
) => {
  let messageHash = ethers.utils.solidityKeccak256(
    ['uint', 'address', 'uint', 'uint', 'uint', 'uint', 'address', 'address'],
    [ethAmount, tokenAddress, tokenAmount, expirationTime, version, chainId, linkId, proxyAddress]
  );
  let messageHashToSign = ethers.utils.arrayify(messageHash);
  let signature = await linkdropSigner.signMessage(messageHashToSign);
  return signature;
};

// Generates new link
export const createLink = async (
  linkdropSigner, // Wallet
  ethAmount,
  tokenAddress,
  tokenAmount,
  expirationTime,
  version,
  chainId,
  proxyAddress
) => {
  let linkWallet = ethers.Wallet.createRandom();
  let linkKey = linkWallet.privateKey;
  let linkId = linkWallet.address;
  let linkdropSignerSignature = await signLink(
    linkdropSigner,
    ethAmount,
    tokenAddress,
    tokenAmount,
    expirationTime,
    version,
    chainId,
    linkId,
    proxyAddress
  );
  return {
    linkKey, // link's ephemeral private key
    linkId, // address corresponding to link key
    linkdropSignerSignature // signed by linkdrop verifier
  };
};

export const signReceiverAddress = async (linkKey, receiverAddress) => {
  let wallet = new ethers.Wallet(linkKey);
  let messageHash = ethers.utils.solidityKeccak256(['address'], [receiverAddress]);
  let messageHashToSign = ethers.utils.arrayify(messageHash);
  let signature = await wallet.signMessage(messageHashToSign);
  return signature;
};
