// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@acala-network/contracts/dex/IDEX.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";

contract Dex is ADDRESS {
    IDEX dex = IDEX(ADDRESS.DEX);

    function getLiquidityPool(address tokenA, address tokenB) public view returns (uint256, uint256) {
        return dex.getLiquidityPool(tokenA, tokenB);
    }

    function getLiquidityTokenAddress(address tokenA, address tokenB) public view returns (address) {
        return dex.getLiquidityTokenAddress(tokenA, tokenB);
    }

    function getSwapTargetAmount(address[] memory path, uint256 supplyAmount) public view returns (uint256) {
        return dex.getSwapTargetAmount(path, supplyAmount);
    }

    function getSwapSupplyAmount(address[] memory path, uint256 targetAmount) public view returns (uint256) {
        return dex.getSwapSupplyAmount(path, targetAmount);
    }

    function swapWithExactSupply(address[] memory path, uint256 supplyAmount, uint256 minTargetAmount) public payable returns (bool) {
        return dex.swapWithExactSupply(path, supplyAmount, minTargetAmount);
    }

    function swapWithExactTarget(address[] memory path, uint256 targetAmount, uint256 maxSupplyAmount) public payable returns (bool) {
        return dex.swapWithExactTarget(path, targetAmount, maxSupplyAmount);
    }

    function addLiquidity(address tokenA, address tokenB, uint256 maxAmountA, uint256 maxAmountB, uint256 minShareIncrement) public payable returns (bool) {
        return dex.addLiquidity(tokenA, tokenB, maxAmountA, maxAmountB, minShareIncrement);
    }

    function removeLiquidity(address tokenA, address tokenB, uint256 removeShare, uint256 minWithdrawnA, uint256 minWithdrawnB) public payable returns (bool) {
        return dex.removeLiquidity(tokenA, tokenB, removeShare, minWithdrawnA, minWithdrawnB);
    }
}
