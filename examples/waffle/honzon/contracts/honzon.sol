// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@acala-network/contracts/honzon/IHonzon.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";

contract Honzon is ADDRESS {
    IHonzon honzon = IHonzon(ADDRESS.HONZON);

    function adjustLoan(address currencyId, int128 collateralAdjustment, int128 debitAdjustment) public returns (bool) {
        return honzon.adjustLoan(currencyId, collateralAdjustment, debitAdjustment);
    }

    function closeLoanByDex(address currencyId, uint256 maxCollateralAmount) public returns (bool) {
        return honzon.closeLoanByDex(currencyId, maxCollateralAmount);
    }

    function getPosition(address who, address currencyId) public view returns (uint256, uint256) {
        return honzon.getPosition(who, currencyId);
    }

    function getLiquidationRatio(address currencyId) public view returns (uint256) {
        return honzon.getLiquidationRatio(currencyId);
    }

    function getCurrentCollateralRatio(address who, address currencyId) public view returns (uint256) {
        return honzon.getCurrentCollateralRatio(who, currencyId);
    }

    function getDebitExchangeRate(address currencyId) public view returns (uint256) {
        return honzon.getDebitExchangeRate(currencyId);
    }
}
