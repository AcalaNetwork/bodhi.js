pragma solidity =0.8.9;

contract Echo{
    string public echo;
    uint echoCount;

    event NewEcho(
        string indexed message,
        uint256 count
    );

    constructor() {
        echo = "Deployed successfully!";
    }

    function scream(string memory message) public returns(string memory){
        echo = message;
        echoCount += 1;
        emit NewEcho(message, echoCount);
        return message;
    }
}