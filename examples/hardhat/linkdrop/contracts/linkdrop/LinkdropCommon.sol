pragma solidity ^0.5.6;

import "../interfaces/ILinkdropCommon.sol";
import "../storage/LinkdropStorage.sol";
import "openzeppelin-solidity/contracts/cryptography/ECDSA.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract LinkdropCommon is ILinkdropCommon, LinkdropStorage {

    /**
    * @dev Function called only once to set owner, linkdrop master, contract version and chain id
    * @param _owner Owner address
    * @param _linkdropMaster Address corresponding to master key
    * @param _version Contract version
    * @param _chainId Network id
    */
    function initialize
    (
        address _owner,
        address payable _linkdropMaster,
        uint _version,
        uint _chainId
    )
    public
    returns (bool)
    {
        require(!initialized, "LINKDROP_PROXY_CONTRACT_ALREADY_INITIALIZED");
        owner = _owner;
        linkdropMaster = _linkdropMaster;
        isLinkdropSigner[linkdropMaster] = true;
        version = _version;
        chainId = _chainId;
        initialized = true;
        return true;
    }

    modifier onlyLinkdropMaster() {
        require(msg.sender == linkdropMaster, "ONLY_LINKDROP_MASTER");
        _;
    }

    modifier onlyLinkdropMasterOrFactory() {
        require (msg.sender == linkdropMaster || msg.sender == owner, "ONLY_LINKDROP_MASTER_OR_FACTORY");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == owner, "ONLY_FACTORY");
        _;
    }

    modifier whenNotPaused() {
        require(!paused(), "LINKDROP_PROXY_CONTRACT_PAUSED");
        _;
    }

    /**
    * @dev Indicates whether a link is claimed or not
    * @param _linkId Address corresponding to link key
    * @return True if claimed
    */
    function isClaimedLink(address _linkId) public view returns (bool) {
        return claimedTo[_linkId] != address(0);
    }

    /**
    * @dev Indicates whether a link is canceled or not
    * @param _linkId Address corresponding to link key
    * @return True if canceled
    */
    function isCanceledLink(address _linkId) public view returns (bool) {
        return _canceled[_linkId];
    }

    /**
    * @dev Indicates whether a contract is paused or not
    * @return True if paused
    */
    function paused() public view returns (bool) {
        return _paused;
    }

    /**
    * @dev Function to cancel a link, can only be called by linkdrop master
    * @param _linkId Address corresponding to link key
    * @return True if success
    */
    function cancel(address _linkId) external onlyLinkdropMaster returns (bool) {
        require(!isClaimedLink(_linkId), "LINK_CLAIMED");
        _canceled[_linkId] = true;
        emit Canceled(_linkId);
        return true;
    }

    /**
    * @dev Function to withdraw eth to linkdrop master, can only be called by linkdrop master
    * @return True if success
    */
    function withdraw() external onlyLinkdropMaster returns (bool) {
        linkdropMaster.transfer(address(this).balance);
        return true;
    }

    /**
    * @dev Function to pause contract, can only be called by linkdrop master
    * @return True if success
    */
    function pause() external onlyLinkdropMaster whenNotPaused returns (bool) {
        _paused = true;
        emit Paused();
        return true;
    }

    /**
    * @dev Function to unpause contract, can only be called by linkdrop master
    * @return True if success
    */
    function unpause() external onlyLinkdropMaster returns (bool) {
        require(paused(), "LINKDROP_CONTRACT_ALREADY_UNPAUSED");
        _paused = false;
        emit Unpaused();
        return true;
    }

    /**
    * @dev Function to add new signing key, can only be called by linkdrop master or owner (factory contract)
    * @param _linkdropSigner Address corresponding to signing key
    * @return True if success
    */
    function addSigner(address _linkdropSigner) external payable onlyLinkdropMasterOrFactory returns (bool) {
        require(_linkdropSigner != address(0), "INVALID_LINKDROP_SIGNER_ADDRESS");
        isLinkdropSigner[_linkdropSigner] = true;
        return true;
    }

    /**
    * @dev Function to remove signing key, can only be called by linkdrop master
    * @param _linkdropSigner Address corresponding to signing key
    * @return True if success
    */
    function removeSigner(address _linkdropSigner) external onlyLinkdropMaster returns (bool) {
        require(_linkdropSigner != address(0), "INVALID_LINKDROP_SIGNER_ADDRESS");
        isLinkdropSigner[_linkdropSigner] = false;
        return true;
    }

    /**
    * @dev Function to destroy this contract, can only be called by owner (factory) or linkdrop master
    * Withdraws all the remaining ETH to linkdrop master
    */
    function destroy() external onlyLinkdropMasterOrFactory {
        selfdestruct(linkdropMaster);
    }

    /**
    * @dev Function for other contracts to be able to fetch the mastercopy version
    * @return Master copy version
    */
    function getMasterCopyVersion() external view returns (uint) {
        return version;
    }

    /**
    * @dev Fallback function to accept ETH
    */
    function () external payable {}

}