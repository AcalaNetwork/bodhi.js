// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

import "@acala-network/contracts/oracle/IOracle.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";

contract Prices is ADDRESS {
    IOracle oracle = IOracle(ADDRESS.Oracle);

    function getPrice(address token) public view returns (uint256) {
        uint256 price = oracle.getPrice(token);
        return price;
    }
}
