pragma solidity ^0.6.0;

import "@acala-network/contracts/schedule/ISchedule.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";

contract Subscription is ADDRESS {
  address payable public owner;

  uint public subscriptionPrice;
  uint public subscriptionPeriod;

  mapping (address => uint) public balanceOf;
  mapping (address => uint) public subTokensOf;
  mapping (address => uint) public monthsSubscribed;

  ISchedule scheduler = ISchedule(ADDRESS.Schedule);

  constructor(uint _subscriptionPrice, uint _subscriptionPeriod) public payable {
    owner = msg.sender;
    subscriptionPrice = _subscriptionPrice;
    subscriptionPeriod = _subscriptionPeriod;
  }

  function subscribe() public payable {
    require(monthsSubscribed[msg.sender] == 0, "Already subscribed");
    require(msg.value > subscriptionPrice, "Not enough to subscribe");

    uint256 _depositAmount = msg.value - subscriptionPrice;

    balanceOf[msg.sender] = _depositAmount;
    monthsSubscribed[msg.sender] = 1;
    subTokensOf[msg.sender] = 1;

    owner.transfer(subscriptionPrice);

    scheduler.scheduleCall(address(this), 0, 200000, 1000, 10, abi.encodeWithSignature("pay(address)", msg.sender));
  }

  function addFunds() public payable {
    balanceOf[msg.sender] += msg.value;
  }

  function unsubscribe() public {
    monthsSubscribed[msg.sender] = 0;

    if (balanceOf[msg.sender] > 0) {
      msg.sender.transfer(balanceOf[msg.sender]);
      balanceOf[msg.sender] = 0;
    }
  }

  function pay(address _subscriber) public {
    require(msg.sender == address(this), "No Permission");
    require(monthsSubscribed[_subscriber] > 0);

    if (balanceOf[_subscriber] < subscriptionPrice) {
      monthsSubscribed[_subscriber] = 0;
      return;
    }

    monthsSubscribed[_subscriber] += 1;
    balanceOf[_subscriber] -= subscriptionPrice;
    subTokensOf[_subscriber] += monthsSubscribed[_subscriber];
    owner.transfer(subscriptionPrice);

    scheduler.scheduleCall(address(this), 0, 200000, 1000, 10, abi.encodeWithSignature("pay(address)", _subscriber));
  }
}
