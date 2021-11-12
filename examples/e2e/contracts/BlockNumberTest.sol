// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

contract BlcokNumberTest {
    function currentBlock() public view  returns(uint) {
        return block.number;
    }
}
