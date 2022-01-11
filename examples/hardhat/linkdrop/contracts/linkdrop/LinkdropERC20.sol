pragma solidity ^0.5.6;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ILinkdropERC20.sol";
import "./LinkdropCommon.sol";

contract LinkdropERC20 is ILinkdropERC20, LinkdropCommon {
    using SafeMath for uint;

    /**
    * @dev Function to verify linkdrop signer's signature
    * @param _weiAmount Amount of wei to be claimed
    * @param _tokenAddress Token address
    * @param _tokenAmount Amount of tokens to be claimed (in atomic value)
    * @param _expiration Unix timestamp of link expiration time
    * @param _linkId Address corresponding to link key
    * @param _signature ECDSA signature of linkdrop signer
    * @return True if signed with linkdrop signer's private key
    */
    function verifyLinkdropSignerSignature
    (
        uint _weiAmount,
        address _tokenAddress,
        uint _tokenAmount,
        uint _expiration,
        address _linkId,
        bytes memory _signature
    )
    public view
    returns (bool)
    {
        bytes32 prefixedHash = ECDSA.toEthSignedMessageHash
        (
            keccak256
            (
                abi.encodePacked
                (
                    _weiAmount,
                    _tokenAddress,
                    _tokenAmount,
                    _expiration,
                    version,
                    chainId,
                    _linkId,
                    address(this)
                )
            )
        );
        address signer = ECDSA.recover(prefixedHash, _signature);
        return isLinkdropSigner[signer];
    }

    /**
    * @dev Function to verify linkdrop receiver's signature
    * @param _linkId Address corresponding to link key
    * @param _receiver Address of linkdrop receiver
    * @param _signature ECDSA signature of linkdrop receiver
    * @return True if signed with link key
    */
    function verifyReceiverSignature
    (
        address _linkId,
        address _receiver,
        bytes memory _signature
    )
    public view
    returns (bool)
    {
        bytes32 prefixedHash = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(_receiver)));
        address signer = ECDSA.recover(prefixedHash, _signature);
        return signer == _linkId;
    }

    /**
    * @dev Function to verify claim params and make sure the link is not claimed or canceled
    * @param _weiAmount Amount of wei to be claimed
    * @param _tokenAddress Token address
    * @param _tokenAmount Amount of tokens to be claimed (in atomic value)
    * @param _expiration Unix timestamp of link expiration time
    * @param _linkId Address corresponding to link key
    * @param _linkdropSignerSignature ECDSA signature of linkdrop signer
    * @param _receiver Address of linkdrop receiver
    * @param _receiverSignature ECDSA signature of linkdrop receiver,
    * @param _fee Amount of fee to send to fee receiver
    * @return True if success
    */
    function checkClaimParams
    (
        uint _weiAmount,
        address _tokenAddress,
        uint _tokenAmount,
        uint _expiration,
        address _linkId,
        bytes memory _linkdropSignerSignature,
        address _receiver,
        bytes memory _receiverSignature,
        uint _fee
    )
    public view
    whenNotPaused
    returns (bool)
    {
        // If tokens are being claimed
        if (_tokenAmount > 0) {
            require(_tokenAddress != address(0), "INVALID_TOKEN_ADDRESS");
        }

        // Make sure link is not claimed
        require(isClaimedLink(_linkId) == false, "LINK_CLAIMED");

        // Make sure link is not canceled
        require(isCanceledLink(_linkId) == false, "LINK_CANCELED");

        // Make sure link is not expired
        require(_expiration >= now, "LINK_EXPIRED");

        // Make sure eth amount is available for this contract
        require(address(this).balance >= _weiAmount.add(_fee), "INSUFFICIENT_ETHERS");

        // Make sure tokens are available for this contract
        if (_tokenAddress != address(0)) {
            require
            (
                IERC20(_tokenAddress).balanceOf(linkdropMaster) >= _tokenAmount,
                "INSUFFICIENT_TOKENS"
            );

            require
            (
                IERC20(_tokenAddress).allowance(linkdropMaster, address(this)) >= _tokenAmount, "INSUFFICIENT_ALLOWANCE"
            );
        }

        // Verify that link key is legit and signed by linkdrop signer
        require
        (
            verifyLinkdropSignerSignature
            (
                _weiAmount,
                _tokenAddress,
                _tokenAmount,
                _expiration,
                _linkId,
                _linkdropSignerSignature
            ),
            "INVALID_LINKDROP_SIGNER_SIGNATURE"
        );

        // Verify that receiver address is signed by ephemeral key assigned to claim link (link key)
        require
        (
            verifyReceiverSignature(_linkId, _receiver, _receiverSignature),
            "INVALID_RECEIVER_SIGNATURE"
        );

        return true;
    }

    /**
    * @dev Function to claim ETH and/or ERC20 tokens. Can only be called when contract is not paused
    * @param _weiAmount Amount of wei to be claimed
    * @param _tokenAddress Token address
    * @param _tokenAmount Amount of tokens to be claimed (in atomic value)
    * @param _expiration Unix timestamp of link expiration time
    * @param _linkId Address corresponding to link key
    * @param _linkdropSignerSignature ECDSA signature of linkdrop signer
    * @param _receiver Address of linkdrop receiver
    * @param _receiverSignature ECDSA signature of linkdrop receiver
    * @param _feeReceiver Address to transfer fees to
    * @param _fee Amount of fee to send to fee receiver
    * @return True if success
    */
    function claim
    (
        uint _weiAmount,
        address _tokenAddress,
        uint _tokenAmount,
        uint _expiration,
        address _linkId,
        bytes calldata _linkdropSignerSignature,
        address payable _receiver,
        bytes calldata _receiverSignature,
        address payable _feeReceiver,
        uint _fee
    )
    external
    onlyFactory
    whenNotPaused
    returns (bool)
    {

        // Make sure params are valid
        require
        (
            checkClaimParams
            (
                _weiAmount,
                _tokenAddress,
                _tokenAmount,
                _expiration,
                _linkId,
                _linkdropSignerSignature,
                _receiver,
                _receiverSignature,
                _fee
            ),
            "INVALID_CLAIM_PARAMS"
        );

        // Mark link as claimed
        claimedTo[_linkId] = _receiver;

        // Make sure transfer succeeds
        require(_transferFunds(_weiAmount, _tokenAddress, _tokenAmount, _receiver, _feeReceiver, _fee), "TRANSFER_FAILED");

        // Emit claim event
        emit Claimed(_linkId, _weiAmount, _tokenAddress, _tokenAmount, _receiver);

        return true;
    }

    /**
    * @dev Internal function to transfer ethers and/or ERC20 tokens
    * @param _weiAmount Amount of wei to be claimed
    * @param _tokenAddress Token address
    * @param _tokenAmount Amount of tokens to be claimed (in atomic value)
    * @param _receiver Address to transfer funds to
    * @param _feeReceiver Address to transfer fees to
    * @param _fee Amount of fee to send to fee receiver
    * @return True if success
    */
    function _transferFunds
    (
        uint _weiAmount,
        address _tokenAddress,
        uint _tokenAmount,
        address payable _receiver,
        address payable _feeReceiver,
        uint _fee
    )
    internal returns (bool)
    {
        // Transfer fees
        _feeReceiver.transfer(_fee);

        // Transfer ethers
        if (_weiAmount > 0) {
            _receiver.transfer(_weiAmount);
        }

        // Transfer tokens
        if (_tokenAmount > 0) {
            IERC20(_tokenAddress).transferFrom(linkdropMaster, _receiver, _tokenAmount);
        }

        return true;
    }

}