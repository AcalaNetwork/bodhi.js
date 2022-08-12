// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@acala-network/contracts/stable-asset/IStableAsset.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";

contract StableAsset is ADDRESS {
    IStableAsset stableAsset = IStableAsset(ADDRESS.STABLE_ASSET);

    function getStableAssetPoolTokens(uint32 poolId) public view returns (bool, address[] memory) {
        return stableAsset.getStableAssetPoolTokens(poolId);
    }

    function getStableAssetPoolTotalSupply(uint32 poolId) public view returns (bool, uint256) {
        return stableAsset.getStableAssetPoolTotalSupply(poolId);
    }

    function getStableAssetPoolPrecision(uint32 poolId) public view returns (bool, uint256) {
        return stableAsset.getStableAssetPoolPrecision(poolId);
    }

    function getStableAssetPoolMintFee(uint32 poolId) public view returns (bool, uint256) {
        return stableAsset.getStableAssetPoolMintFee(poolId);
    }

    function getStableAssetPoolSwapFee(uint32 poolId) public view returns (bool, uint256) {
        return stableAsset.getStableAssetPoolSwapFee(poolId);
    }

    function getStableAssetPoolRedeemFee(uint32 poolId) public view returns (bool, uint256) {
        return stableAsset.getStableAssetPoolRedeemFee(poolId);
    }

    function stableAssetSwap(uint32 poolId, uint32 i, uint32 j, uint256 dx, uint256 minDY, uint32 assetLength) public returns (bool) {
        return stableAsset.stableAssetSwap(poolId, i, j, dx, minDY, assetLength);
    }

    function stableAssetMint(uint32 poolId, uint256[] calldata amounts, uint256 minMintAmount) public returns (bool) {
        return stableAsset.stableAssetMint(poolId, amounts, minMintAmount);
    }

    function stableAssetRedeem(uint32 poolId, uint256 redeemAmount, uint256[] calldata amounts) public returns (bool) {
        return stableAsset.stableAssetRedeem(poolId, redeemAmount, amounts);
    }

    function stableAssetRedeemSingle(uint32 poolId, uint256 redeemAmount, uint32 i, uint256 minRedeemAmount, uint32 assetLength) public returns (bool) {
        return stableAsset.stableAssetRedeemSingle(poolId, redeemAmount, i, minRedeemAmount, assetLength);
    }

    function stableAssetRedeemMulti(uint32 poolId, uint256[] calldata amounts, uint256 maxMintAmount) public returns (bool) {
        return stableAsset.stableAssetRedeemMulti(poolId, amounts, maxMintAmount);
    }
}
