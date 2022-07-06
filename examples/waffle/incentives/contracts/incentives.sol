// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@acala-network/contracts/incentives/InterfaceIncentives.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";

contract Incentives is ADDRESS {
    InterfaceIncentives incentives = InterfaceIncentives(ADDRESS.Incentives);

    function getIncentiveRewardAmount(InterfaceIncentives.PoolId pool, address poolCurrencyId, address rewardCurrencyId) public view returns (uint256) {
        return incentives.getIncentiveRewardAmount(pool, poolCurrencyId, rewardCurrencyId);
    }

    function getDexRewardRate(address currencyId) public view returns (uint256) {
        return incentives.getDexRewardRate(currencyId);
    }

    function depositDexShare(address currencyId, uint256 amount) public returns (bool) {
        return incentives.depositDexShare(currencyId, amount);
    }

    function withdrawDexShare(address currencyId, uint256 amount) public returns (bool) {
        return incentives.withdrawDexShare(currencyId, amount);
    }

    function claimRewards(InterfaceIncentives.PoolId pool, address poolCurrencyId) public returns (bool) {
        return incentives.claimRewards(pool, poolCurrencyId);
    }

    function getClaimRewardDeductionRate(InterfaceIncentives.PoolId pool, address poolCurrencyId) public view returns (uint256) {
        return incentives.getClaimRewardDeductionRate(pool, poolCurrencyId);
    }

    function getPendingRewards(address[] calldata currencyIds, InterfaceIncentives.PoolId pool, address poolCurrencyId, address who) public view returns (uint256[] memory) {
        return incentives.getPendingRewards(currencyIds, pool, poolCurrencyId, who);
    }
}
