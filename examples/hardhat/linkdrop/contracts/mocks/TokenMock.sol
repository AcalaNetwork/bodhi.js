pragma solidity ^0.5.1;
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract TokenMock is ERC20, ERC20Detailed {

    // =================================================================================================================
    //                                         Token Mock
    // =================================================================================================================
    
    // Mint tokens to deployer
    constructor() public ERC20Detailed ("Mock Token", "MOCK", 0) {
        _mint(msg.sender, 1000000000);
    }
    
    // Faucet function to get free tokens
    function faucet() external {
        _mint(msg.sender, 100000000);
    }
    
}