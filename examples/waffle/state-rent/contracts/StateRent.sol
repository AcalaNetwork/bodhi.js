// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@acala-network/contracts/state_rent/IStateRent.sol";
import "@acala-network/contracts/utils/Address.sol";

contract StateRent is ADDRESS {
    IStateRent stateRent = IStateRent(ADDRESS.StateRent);

    function newContractExtraBytes() public view returns (uint256) {
        return stateRent.newContractExtraBytes();
    }

    function storageDepositPerByte() public view returns (uint256) {
        return stateRent.storageDepositPerByte();
    }

    function maintainerOf(address contract_address) public view returns (address) {
        return stateRent.maintainerOf(contract_address);
    }

    function developerDeposit() public view returns (uint256) {
        return stateRent.developerDeposit();
    }

    function deploymentFee() public view returns (uint256) {
        return stateRent.deploymentFee();
    }

    function transferMaintainer(address contract_address, address new_maintainer) public returns (bool) {
        return stateRent.transferMaintainer(contract_address, new_maintainer);
    }
}
