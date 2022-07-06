// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@acala-network/contracts/evm-accounts/IEVMAccounts.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";

contract EVMAccounts is ADDRESS {
    IEVMAccounts evmAccounts = IEVMAccounts(ADDRESS.EVMAccounts);

    function getAccountId(address evmAddress) public view returns (bytes32) {
        return evmAccounts.getAccountId(evmAddress);
    }

    function getEvmAddress(bytes32 accountId) public view returns (address) {
        return evmAccounts.getEvmAddress(accountId);
    }

    function claimDefaultEvmAddress(bytes32 accountId) public returns (bool) {
        return evmAccounts.claimDefaultEvmAddress(accountId);
    }
}
