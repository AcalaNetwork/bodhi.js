pragma solidity ^0.5.1;
import "openzeppelin-solidity/contracts/token/ERC721/ERC721Metadata.sol";

contract NFTMock is ERC721Metadata {

    // =================================================================================================================
    //                                         NFT Mock
    // =================================================================================================================

    // Mint 10 NFTs to deployer
    constructor() public ERC721Metadata ("Mock NFT", "MOCK") {
        for (uint i = 0; i < 10; i++) {
            super._mint(msg.sender, i);
            super._setTokenURI(i, "https://api.myjson.com/bins/1dhwd6");
        }

        for (uint i = 11; i < 15; i++) {
            super._mint(address(this), i);
            super._setTokenURI(i, "https://api.myjson.com/bins/1dhwd6");
        }
    }

}