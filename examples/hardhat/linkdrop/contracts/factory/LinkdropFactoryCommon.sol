pragma solidity ^0.5.6;

import "../storage/LinkdropFactoryStorage.sol";
import "../interfaces/ILinkdropCommon.sol";
import "./FeeManager.sol";
import "./RelayerManager.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract LinkdropFactoryCommon is LinkdropFactoryStorage, FeeManager, RelayerManager {
    using SafeMath for uint;

    /**
    * @dev Indicates whether a proxy contract for linkdrop master is deployed or not
    * @param _linkdropMaster Address of linkdrop master
    * @param _campaignId Campaign id
    * @return True if deployed
    */
    function isDeployed(address _linkdropMaster, uint _campaignId) public view returns (bool) {
        return (deployed[salt(_linkdropMaster, _campaignId)] != address(0));
    }

    /**
    * @dev Indicates whether a link is claimed or not
    * @param _linkdropMaster Address of lindkrop master
    * @param _campaignId Campaign id
    * @param _linkId Address corresponding to link key
    * @return True if claimed
    */
    function isClaimedLink(address payable _linkdropMaster, uint _campaignId, address _linkId) public view returns (bool) {

        if (!isDeployed(_linkdropMaster, _campaignId)) {
            return false;
        }
        else {
            address payable proxy = address(uint160(deployed[salt(_linkdropMaster, _campaignId)]));
            return ILinkdropCommon(proxy).isClaimedLink(_linkId);
        }

    }

    /**
    * @dev Function to deploy a proxy contract for msg.sender
    * @param _campaignId Campaign id
    * @return Proxy contract address
    */
    function deployProxy(uint _campaignId)
    public
    payable
    returns (address payable proxy)
    {
        proxy = _deployProxy(msg.sender, _campaignId);
    }

    /**
    * @dev Function to deploy a proxy contract for msg.sender and add a new signing key
    * @param _campaignId Campaign id
    * @param _signer Address corresponding to signing key
    * @return Proxy contract address
    */
    function deployProxyWithSigner(uint _campaignId, address _signer)
    public
    payable
    returns (address payable proxy)
    {
        proxy = deployProxy(_campaignId);
        ILinkdropCommon(proxy).addSigner(_signer);
    }

    /**
    * @dev Internal function to deploy a proxy contract for linkdrop master
    * @param _linkdropMaster Address of linkdrop master
    * @param _campaignId Campaign id
    * @return Proxy contract address
    */
    function _deployProxy(address payable _linkdropMaster, uint _campaignId)
    internal
    returns (address payable proxy)
    {

        require(!isDeployed(_linkdropMaster, _campaignId), "LINKDROP_PROXY_CONTRACT_ALREADY_DEPLOYED");
        require(_linkdropMaster != address(0), "INVALID_LINKDROP_MASTER_ADDRESS");

        bytes32 salt = salt(_linkdropMaster, _campaignId);
        bytes memory initcode = getInitcode();

        assembly {
            proxy := create2(0, add(initcode, 0x20), mload(initcode), salt)
            if iszero(extcodesize(proxy)) { revert(0, 0) }
        }

        deployed[salt] = proxy;

        // Initialize owner address, linkdrop master address master copy version in proxy contract
        require
        (
            ILinkdropCommon(proxy).initialize
            (
                address(this), // Owner address
                _linkdropMaster, // Linkdrop master address
                masterCopyVersion,
                chainId
            ),
            "INITIALIZATION_FAILED"
        );

        // Send funds attached to proxy contract
        proxy.transfer(msg.value);

        // Set standard fee for the proxy
        _setFee(proxy, standardFee);

        emit Deployed(_linkdropMaster, _campaignId, proxy, salt);
        return proxy;
    }

    /**
    * @dev Function to destroy proxy contract, called by proxy owner
    * @param _campaignId Campaign id
    * @return True if destroyed successfully
    */
    function destroyProxy(uint _campaignId)
    public
    returns (bool)
    {
        require(isDeployed(msg.sender, _campaignId), "LINKDROP_PROXY_CONTRACT_NOT_DEPLOYED");
        address payable proxy = address(uint160(deployed[salt(msg.sender, _campaignId)]));
        ILinkdropCommon(proxy).destroy();
        delete deployed[salt(msg.sender, _campaignId)];
        delete fees[proxy];
        emit Destroyed(msg.sender, proxy);
        return true;
    }

    /**
    * @dev Function to get bootstrap initcode for generating repeatable contract addresses
    * @return Static bootstrap initcode
    */
    function getInitcode()
    public view
    returns (bytes memory)
    {
        return _initcode;
    }

    /**
    * @dev Function to fetch the actual contract bytecode to install. Called by proxy when executing initcode
    * @return Contract bytecode to install
    */
    function getBytecode()
    public view
    returns (bytes memory)
    {
        return _bytecode;
    }

    /**
    * @dev Function to set new master copy and update contract bytecode to install. Can only be called by factory owner
    * @param _masterCopy Address of linkdrop mastercopy contract to calculate bytecode from
    * @return True if updated successfully
    */
    function setMasterCopy(address payable _masterCopy)
    public onlyOwner
    returns (bool)
    {
        require(_masterCopy != address(0), "INVALID_MASTER_COPY_ADDRESS");
        masterCopyVersion = masterCopyVersion.add(1);

        require
        (
            ILinkdropCommon(_masterCopy).initialize
            (
                address(0), // Owner address
                address(0), // Linkdrop master address
                masterCopyVersion,
                chainId
            ),
            "INITIALIZATION_FAILED"
        );

        bytes memory bytecode = abi.encodePacked
        (
            hex"363d3d373d3d3d363d73",
            _masterCopy,
            hex"5af43d82803e903d91602b57fd5bf3"
        );

        _bytecode = bytecode;

        emit SetMasterCopy(_masterCopy, masterCopyVersion);
        return true;
    }

    /**
    * @dev Function to fetch the master copy version installed (or to be installed) to proxy
    * @param _linkdropMaster Address of linkdrop master
    * @param _campaignId Campaign id
    * @return Master copy version
    */
    function getProxyMasterCopyVersion(address _linkdropMaster, uint _campaignId) external view returns (uint) {

        if (!isDeployed(_linkdropMaster, _campaignId)) {
            return masterCopyVersion;
        }
        else {
            address payable proxy = address(uint160(deployed[salt(_linkdropMaster, _campaignId)]));
            return ILinkdropCommon(proxy).getMasterCopyVersion();
        }
    }

    /**
     * @dev Function to hash `_linkdropMaster` and `_campaignId` params. Used as salt when deploying with create2
     * @param _linkdropMaster Address of linkdrop master
     * @param _campaignId Campaign id
     * @return Hash of passed arguments
     */
    function salt(address _linkdropMaster, uint _campaignId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_linkdropMaster, _campaignId));
    }

}