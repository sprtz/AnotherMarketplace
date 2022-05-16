// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.4;




import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";





contract SomeERC20 is ERC20, Ownable {


    constructor(
        string memory name,
        string memory symbol,
        uint initialSupply
        )
        ERC20(name, symbol) 
    {
        _mint(msg.sender, initialSupply);
    }


    function mint(
        address account,
        uint256 amount
        ) 
        external
        onlyOwner 
    {
        _mint(account, amount);
    }

}