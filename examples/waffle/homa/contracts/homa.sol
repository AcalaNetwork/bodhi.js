// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@acala-network/contracts/homa/IHoma.sol";
import "@acala-network/contracts/utils/AcalaAddress.sol";

contract Homa is ADDRESS {
    IHoma homa = IHoma(ADDRESS.Homa);

    function mint(uint256 mintAmount) public returns (bool) {
        return homa.mint(mintAmount);
    }

    function requestRedeem(uint256 redeemAmount, bool fastMatch) public returns (bool) {
        return homa.requestRedeem(redeemAmount, fastMatch);
    }

    function getExchangeRate() public view returns (uint256) {
        return homa.getExchangeRate();
    }

    function getEstimatedRewardRate() public view returns (uint256) {
        return homa.getEstimatedRewardRate();
    }

    function getCommissionRate() public view returns (uint256) {
        return homa.getCommissionRate();
    }

    function getFastMatchFee() public view returns (uint256) {
        return homa.getFastMatchFee();
    }
}
