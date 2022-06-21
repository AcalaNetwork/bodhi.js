// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol';
import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';

import "@acala-network/contracts/oracle/IOracle.sol";
import "@acala-network/contracts/schedule/ISchedule.sol";
import "@acala-network/contracts/utils/AcalaAddress.sol";

/// @title Arbitrager example
/// @notice You can use this contract to deploy your arbitrager that uses the Scheduler to periodically swap tokens based on their value
contract Arbitrager is ADDRESS {
    address public immutable factory;
    IUniswapV2Router01 public immutable router;
    IERC20 public immutable tokenA;
    IERC20 public immutable tokenB;
    uint256 public immutable period;

    uint256 constant MAX_INT = uint256(-1);

    bool private initialized;

    /// @notice Constructor sets the global variables and schedules execution of trigger with Scheduler
    /// @param factory_ address Address of the Uniswap Factory
    /// @param router_ address Address of the Uniswap V2 Router 01 smart contract
    /// @param tokenA_ address Address of the first token's smart contract 
    /// @param tokenB_ address Address of the second token's smart contract 
    /// @param period_ uint The amount of time to elapse from deploying this contract to having Scheduler trigger the trigger() function
    /// @dev The constructor sets the approval of both tokens to maximum available value (2^256 - 1)
    constructor(
        address factory_,
        IUniswapV2Router01 router_,
        IERC20 tokenA_,
        IERC20 tokenB_,
        uint period_
    )
        public
    {
        // Assign global variables
        factory = factory_;
        router = router_;
        tokenA = tokenA_;
        tokenB = tokenB_;
        period = period_;

        // Set approval amount for tokens at maximum possible value
        tokenA_.approve(address(router_), MAX_INT);
        tokenB_.approve(address(router_), MAX_INT);
    }

    /// @notice The contract is charged by the Scheduler for handling fees and needs to be transferred first.
    /// @dev It schedules another call with Scheduler using the initial period
    function initialize() public {
	require(!initialized, "Contract instance has already been initialized");
        initialized = true;

        // Call Scheduler smart contract and schedule a call of trigger() function
        ISchedule(ADDRESS.Schedule).scheduleCall(
                                        address(this),
                                        0,
                                        1000000,
                                        5000,
                                        period,
                                        abi.encodeWithSignature("trigger()")
                                    );
    }

    /// @notice Calculates how many of which token to swap with the other token
    /// @dev Can only be called by self, or in our case, by Scheduler smartr contract
    /// @dev It schedules another call with Scheduler using the initial period
    function trigger() public {
        require(msg.sender == address(this), "Can only be called by this smart contract.");
        // Schedule another call with Scheduler
        ISchedule(ADDRESS.Schedule).scheduleCall(
                                        address(this),
                                        0,
                                        1000000,
                                        5000,
                                        period,
                                        abi.encodeWithSignature("trigger()")
                                    );

        // Get prices of the tokens from the Oracle
        uint256 priceA = IOracle(ADDRESS.Oracle).getPrice(address(tokenA));
        uint256 priceB = IOracle(ADDRESS.Oracle).getPrice(address(tokenB));

        // Get balances of the tokens from the respective smart contracts
        uint256 balA = tokenA.balanceOf(address(this));
        uint256 balB = tokenB.balanceOf(address(this));

        // Retrieve reserve of tokens from Uniswap V2 Library smart contract
        (uint256 reserveA, uint256 reserveB) = UniswapV2Library.getReserves(
                                                                    factory,
                                                                    address(tokenA),
                                                                    address(tokenB)
                                                                );

        // Calculate which token to get
        bool buyA;
        if (reserveA > reserveB) {
            uint256 reserveRatio = reserveA * 1000 / reserveB;
            uint256 priceRatio = priceA * 1000 / priceB;
            buyA = reserveRatio < priceRatio;
        } else {
            uint256 reserveRatio = reserveB * 1000 / reserveA;
            uint256 priceRatio = priceB * 1000 / priceA;
            buyA = reserveRatio > priceRatio;
        }
 
        // Determine the amount of the token to get
        uint256 amount;
        address[] memory path = new address[](2);
        if (buyA) {
            amount = balB / 10;
            path[0] = address(tokenB);
            path[1] = address(tokenA);
        } else {
            amount = balA / 10;
            path[0] = address(tokenA);
            path[1] = address(tokenB);
        }

        // Swap the two tokens based on the caluclations from above
        if (amount != 0) {
            router.swapExactTokensForTokens(
                        amount,
                        0,
                        path,
                        address(this),
                        now + 1
                    );
        }
    }
}
