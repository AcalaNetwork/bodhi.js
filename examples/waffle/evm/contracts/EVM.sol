// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@acala-network/contracts/evm/IEVM.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";

contract EVM is ADDRESS {
    IEVM evm = IEVM(ADDRESS.EVM);

    function newContractExtraBytes() public view returns (uint256) {
        return evm.newContractExtraBytes();
    }

    function storageDepositPerByte() public view returns (uint256) {
        return evm.storageDepositPerByte();
    }

    function maintainerOf(address contractAddress) public view returns (address) {
        return evm.maintainerOf(contractAddress);
    }

    function developerDeposit() public view returns (uint256) {
        return evm.developerDeposit();
    }

    function publicationFee() public view returns (uint256) {
        return evm.publicationFee();
    }

    function transferMaintainer(address contractAddress, address newMaintainer) public returns (bool) {
        return evm.transferMaintainer(contractAddress, newMaintainer);
    }

    function developerEnable() public returns (bool) {
        return evm.developerEnable();
    }

    function developerDisable() public returns (bool) {
        return evm.developerDisable();
    }

    function developerStatus(address developer) public view returns (bool) {
        return evm.developerStatus(developer);
    }

    function publishContract(address contractAddress) public returns (bool) {
        return evm.publishContract(contractAddress);
    }
}
