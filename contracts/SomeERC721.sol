//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;


import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";



contract SomeERC721 is ERC721URIStorage, AccessControl {


   bytes32 private constant ADMIN_ROLE = keccak256("ADMIN_ROLE");


   using Counters for Counters.Counter;
   Counters.Counter private currentTokenId;


   constructor() ERC721("NFTForMarketplace721", "Mrkt721") 
   {
      _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
      _setupRole(ADMIN_ROLE, msg.sender);
   }


    function safeMint(
       address to,
       string memory tokenID
       ) 
       external
       onlyRole(ADMIN_ROLE) 
       returns (uint256) 
   {
        currentTokenId.increment();
        uint256 newItemId = currentTokenId.current();

        _safeMint(to, newItemId);
        _setTokenURI(newItemId, tokenID);

        return newItemId;
    }


    function supportsInterface(
       bytes4 interfaceId
       ) 
       public
       view 
       override
       (ERC721, AccessControl) 
       returns (bool) 
   {
      return super.supportsInterface(interfaceId);
   }

}