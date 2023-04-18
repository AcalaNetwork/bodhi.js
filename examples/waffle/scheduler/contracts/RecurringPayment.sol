// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@acala-network/contracts/schedule/ISchedule.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";

contract RecurringPayment is ADDRESS {
    uint period;
    uint remainingCount;
    uint amount;
    address payable to;
    bool private initialized;
    ISchedule scheduler = ISchedule(ADDRESS.SCHEDULE);

    constructor(uint _period, uint _count, uint _amount, address payable _to) public {
        period = _period;
        remainingCount = _count;
        amount = _amount;
        to = _to;
    }

    function initialize() public {
        require(!initialized, "Contract instance has already been initialized");
        initialized = true;
        require(address(this).balance >= remainingCount * amount, "Balance not enough");

        scheduler.scheduleCall(address(this), 0, 100000, 100, period, abi.encodeWithSignature("pay()"));
    }

    function pay() public {
        require(msg.sender == address(this));

        if (remainingCount == 1) {
            selfdestruct(to);
        } else {
            to.transfer(amount);
            
            remainingCount--;
            scheduler.scheduleCall(address(this), 0, 100000, 100, period, abi.encodeWithSignature("pay()"));
        }
    }
}
