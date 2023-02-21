pragma solidity =0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor(uint256 _initialBalance) ERC20("Token", "TKN") public {
        _mint(msg.sender, _initialBalance);
    }
}