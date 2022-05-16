//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;



import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SomeERC721.sol";



contract AnotherMarketplace is ERC721Holder, Ownable {


    using SafeERC20 for IERC20;


    SomeERC721 private nft;
    IERC20 private paymentToken;


    struct Auction {
        uint participantsCount;
        address latestBidder;
        address itemOwner;
        uint latestPrice;
        uint startDate;
    }


    struct Market {
        address itemOwner; 
        uint itemPrice;
    }


    mapping (uint => Auction) private auctionItems;
    mapping (uint => Market) private listedItems;


    uint public minParticipantsCount = 2;
    uint public auctionDuration = 3 days;



    constructor(
        address some721,
        address some20
        ) 
    {
        nft = SomeERC721(some721);
        paymentToken = IERC20(some20);
    }



    function setMinParticipantsCount(
        uint participantsCount
        ) 
        external
        onlyOwner 
    {
        minParticipantsCount = participantsCount;
    }


    function setNewDuration(
        uint duration
        ) 
        external
        onlyOwner
    {
        auctionDuration = duration;
    }


    function createItem(
        address to,
        string memory id
        )
        external
    {
        nft.safeMint(to, id);
    }


    function listItem(
        uint tokenId,
        uint price
        ) 
        external
    {
        require(price > 0, "Incorrect price");

        Market storage market = listedItems[tokenId];
        require(market.itemOwner == address(0), "Token has been already listed");

        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        market.itemOwner = msg.sender;
        market.itemPrice = price;
    }


    function buyItem(
        uint tokenId
        ) 
        external
    {
        Market memory market = listedItems[tokenId];

        require(market.itemOwner != address(0), "Token is not listed");
        require(market.itemOwner != msg.sender, "Seller and buyer should differ");

        paymentToken.safeTransferFrom(msg.sender, market.itemOwner, market.itemPrice);
        nft.safeTransferFrom(address(this), msg.sender, tokenId);

        delete listedItems[tokenId];
    }   


    function cancel(
        uint tokenId
        )
        external
    {
        require(listedItems[tokenId].itemOwner == msg.sender, "Not permitted");

        nft.safeTransferFrom(address(this), msg.sender, tokenId);

        delete listedItems[tokenId];
    }


    function listItemOnAuction(
        uint tokenId,
        uint minPrice
        )
        external
    {
        require(minPrice > 0, "Incorrect price");

        Auction storage auction = auctionItems[tokenId];
        require(auction.itemOwner == address(0), "Token has been already listed");

        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        auction.startDate = block.timestamp;
        auction.latestPrice = minPrice;
        auction.itemOwner = msg.sender;
        auction.participantsCount = 0;
    }


    function makeBid(
        uint tokenId,
        uint price
        ) 
        external 
    {
        Auction storage auction = auctionItems[tokenId];

        require(auction.itemOwner != address(0), "Token is not listed");
        require((block.timestamp - auction.startDate) < auctionDuration, "Action has finished, bidding is not possible");
        require(price > auction.latestPrice, "Bid less or equal than latest bid");

        if (auction.participantsCount > 0) {
            paymentToken.safeTransfer(auction.latestBidder, auction.latestPrice); 
        }

        paymentToken.safeTransferFrom(msg.sender, address(this), price);

        auction.latestBidder = msg.sender;
        auction.latestPrice = price;
        auction.participantsCount++;
    }


    function finishAuction(
        uint id
        ) 
        external
    {
        require(auctionItems[id].itemOwner != address(0), "Token is not listed");
        require((block.timestamp - auctionItems[id].startDate) >= auctionDuration, "Auction cannot be finished now");

        completeAuction(id);
    }


    function cancelAuction(
        uint id
        ) 
        external
        onlyOwner
    {
        require(auctionItems[id].itemOwner != address(0), "Token is not listed");

        completeAuction(id);

    }


    function completeAuction(
        uint id
        ) 
        internal
    {
        Auction memory auction = auctionItems[id];

        address paymentReceiver;
        address nftReceiver;

        if (auction.participantsCount > minParticipantsCount) {
            paymentReceiver = auction.itemOwner;
            nftReceiver = auction.latestBidder;
        } else {
            paymentReceiver = auction.latestBidder;
            nftReceiver = auction.itemOwner;
        }

        if (auction.participantsCount > 0) {
            paymentToken.safeTransfer(paymentReceiver, auction.latestPrice);
        }

        nft.safeTransferFrom(address(this), nftReceiver, id);

        delete auctionItems[id];
    }
}
