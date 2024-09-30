pragma solidity =0.8.20;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./Greeter.sol";

contract GreeterV2 is Greeter  {
    string private greeting;

    function setGreetingV2(string memory _greeting) public {
        string memory newGreeting = string(abi.encodePacked(_greeting, " - V2"));
        console.log("<V2> Changing greeting from '%s' to '%s'", greeting, newGreeting);
        setGreeting(newGreeting);
    }
}
