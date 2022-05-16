import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SomeERC20, SomeERC721, AnotherMarketplace } from "../typechain";
import { ethers, network } from "hardhat";
import { BigNumber } from "ethers";
import { expect } from "chai";


describe("AnotherMarketplace", () => {

  const duration = 3 * 24 * 60; 

  const initialBalance = BigNumber.from(100);
  const uri = "https://bafybeigdhdjdzf6fsuw7fu72h42vs7au5f5zlnsscjxwp4kq33c5iry7sm.ipfs.nftstorage.link/metadata/1";
  const price = BigNumber.from(2);


  const bid1 = BigNumber.from(3);
  const bid2 = BigNumber.from(5);
  const bid3 = BigNumber.from(10);

  let marketplace: AnotherMarketplace;
  let contractErc721: SomeERC721;
  let contractErc20: SomeERC20;
  let owner: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;


  let clean: any; 


  beforeEach(async () => {

    [owner, account1, account2] = await ethers.getSigners();

    const erc20_factory = await ethers.getContractFactory("SomeERC20");
    contractErc20 = <SomeERC20>(await erc20_factory.deploy("DedBomBom", "BomBom", initialBalance));
    await contractErc20.deployed();

    await contractErc20.mint(owner.address, initialBalance);
    await contractErc20.mint(account1.address, initialBalance);
    await contractErc20.mint(account2.address, initialBalance);
  

    const erc721_factory = await ethers.getContractFactory("SomeERC721");
    contractErc721 = <SomeERC721>(await erc721_factory.deploy());
    await contractErc721.deployed();

    const marketplaceFactory = await ethers.getContractFactory("AnotherMarketplace");
    marketplace = <AnotherMarketplace>(await marketplaceFactory.deploy(contractErc721.address, contractErc20.address));
    await marketplace.deployed();


    const role = ethers.utils.id("ADMIN_ROLE");
    await contractErc721.grantRole(role, marketplace.address);

    await contractErc20.connect(owner).approve(marketplace.address, initialBalance);
    await contractErc20.connect(account1).approve(marketplace.address, initialBalance);
    await contractErc20.connect(account2).approve(marketplace.address, initialBalance);

    await contractErc721.setApprovalForAll(marketplace.address, true);

    clean = await network.provider.request({ method: "evm_snapshot", params: [] });
  });


  afterEach(async () => {
    await network.provider.request({ method: "evm_revert", params: [clean] });
    clean = await network.provider.request({ method: "evm_snapshot", params: [] });
  });


  describe("function setMinParticipantsCount", () => {

    it("Should update minimum participants count", async () => {
      const newAuctionMinParticipantsCount = 4;

      await marketplace.setMinParticipantsCount(newAuctionMinParticipantsCount);
      expect(await marketplace.minParticipantsCount()).to.equal(newAuctionMinParticipantsCount);
    });

  });


  describe("function setNewDuration", () => {

    it("Should update duration", async () => {
      const newDuration = 4 * 24 * 60 * 60; 

      await marketplace.setNewDuration(newDuration);
      expect(await marketplace.auctionDuration()).to.equal(newDuration);
    });

  });


  describe("function createItem", () => {

    it("Should create nft item for the specified account", async () => {

      await marketplace.createItem(account1.address, uri);
      expect(await contractErc721.ownerOf(1)).to.equal(account1.address);
    });

  });


  describe("function listItem", () => {


    it("Should revert when price is zero", async () => {
      await expect(marketplace.connect(account1).listItem(1, 0)).to.be.revertedWith("Incorrect price");
    });


    it("Should revert when nft has been already listed", async () => {

      await marketplace.createItem(account1.address, uri);
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItem(1, price);
      await expect(marketplace.connect(account1).listItem(1, price)).to.be.revertedWith("Token has been already listed");
    });


    it("Should list nft item", async () => {

      await marketplace.createItem(account1.address, uri);
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItem(2, price);
      expect(await contractErc721.ownerOf(2)).to.equal(marketplace.address);
    });

  });


  describe("function buyItem", () => {

    it("Should revert when user buys not listed nft", async () => {
      await expect(marketplace.connect(account1).buyItem(1)).to.be.revertedWith("Token is not listed");
    });


    it("Should revert when nft owner buys his own nft", async () => {

      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItem(1, price);
      await expect(marketplace.connect(account1).buyItem(1)).to.be.revertedWith("Seller and buyer should differ");
    });


    it("Should buy nft item", async () => {

      await marketplace.createItem(account1.address, uri);
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItem(1, price);
      await marketplace.connect(account2).buyItem(1);

      expect(await contractErc721.ownerOf(1)).to.equal(account2.address);
      expect(await contractErc20.balanceOf(account2.address)).to.equal(initialBalance.sub(price));
      expect(await contractErc20.balanceOf(account1.address)).to.equal(initialBalance.add(price));
    });
  });


  describe("function cancel", () => {


      it("Should revert when user cancels not listed nft", async () => {
        await expect(marketplace.connect(account1).cancel(2)).to.be.revertedWith("Not permitted");
      });


      it("Should revert when not nft owner cancels listing", async () => {
        await expect(marketplace.connect(account2).cancel(1)).to.be.revertedWith("Not permitted");
      });


      it("Should cancel nft listing", async () => {

        await marketplace.createItem(account1.address, uri);
        await marketplace.createItem(account1.address, uri);
        await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
        await marketplace.connect(account1).listItem(1, price);

        await marketplace.connect(account1).cancel(1);
        expect(await contractErc721.ownerOf(1)).to.equal(account1.address);
      });
  });


  describe("function listItemOnAuction", () => {

    it("Should revert when price is zero", async () => {
      await expect(marketplace.connect(account1).listItemOnAuction(1, 0)).to.be.revertedWith("Incorrect price");
    });


    it("Should revert when nft has been already listed in auction", async () => {

      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItemOnAuction(1, price);
      await expect(marketplace.connect(account1).listItemOnAuction(1, price)).to.be.revertedWith("Token has been already listed");
    });


    it("Should list nft on auction", async () => {

      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItemOnAuction(1, price);
      expect(await contractErc721.ownerOf(1)).to.equal(marketplace.address);
    });
  });


  describe("function makeBid", () => {

    it("Should revert when nft is not listed in auction", async () => {
      await expect(marketplace.connect(account2).makeBid(1, price)).to.be.revertedWith("Token is not listed");
    });


    it("Should revert if next bid is lower than the latest one", async () => {

      await marketplace.createItem(account1.address, uri);
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItemOnAuction(1, price);

      await expect(marketplace.connect(account2).makeBid(1, price)).to.be.revertedWith("Bid less or equal than latest bid");
    });


    it("Should make a bid", async () => {

      await marketplace.createItem(account1.address, uri);
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItemOnAuction(1, price);

      await marketplace.connect(account2).makeBid(1, bid1);
      expect(await contractErc20.balanceOf(account1.address)).to.equal(initialBalance);
      expect(await contractErc20.balanceOf(account2.address)).to.equal(initialBalance.sub(bid1));
      expect(await contractErc20.balanceOf(marketplace.address)).to.equal(bid1);

      await marketplace.connect(account1).makeBid(1, bid2);

      expect(await contractErc20.balanceOf(account1.address)).to.equal(initialBalance.sub(bid2));
      expect(await contractErc20.balanceOf(account2.address)).to.equal(initialBalance);
      expect(await contractErc20.balanceOf(marketplace.address)).to.equal(bid2);

      const seconds = duration * 60;
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine", []);

      await expect(marketplace.connect(account2).makeBid(1, bid2.add(3))).to.be.revertedWith("Action has finished, bidding is not possible");
    });
  });


  describe("function finishAuction", () => {

    it("Should revert when nft is not listed in auction", async () => {
      await expect(marketplace.connect(account1).finishAuction(1)).to.be.revertedWith("Token is not listed");
    });


    it("Should revert when auction period (3 days) is not passed", async () => {

      await marketplace.createItem(account1.address, uri);
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItemOnAuction(1, price);

      const seconds = (duration - 1) * 60;
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine", []);

      await expect(marketplace.connect(account1).finishAuction(1)).to.be.revertedWith("Auction cannot be finished now");
    });


    it("Should finish nft auction with 0 participants", async () => {

      await marketplace.createItem(account1.address, uri);
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItemOnAuction(1, price);

      const seconds = duration * 60;
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine", []);

      await marketplace.connect(account1).finishAuction(1);
      expect(await contractErc721.ownerOf(1)).to.equal(account1.address);
      expect(await contractErc20.balanceOf(account1.address)).to.equal(initialBalance);
    });


    it("Should finish nft auction with less than 3 bids", async () => {

      await marketplace.createItem(account1.address, uri);
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItemOnAuction(1, price);

      await marketplace.connect(account1).makeBid(1, bid1);
      await marketplace.connect(account2).makeBid(1, bid2);

      const seconds = duration * 60;
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine", []);


      await marketplace.connect(account1).finishAuction(1);
      expect(await contractErc721.ownerOf(1)).to.equal(account1.address);
      expect(await contractErc20.balanceOf(account1.address)).to.equal(initialBalance);
      expect(await contractErc20.balanceOf(account2.address)).to.equal(initialBalance);
    });


    it("Should finish nft auction with more than 2 bids", async () => {

      await marketplace.createItem(account1.address, uri);
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItemOnAuction(1, price);


      await marketplace.makeBid(1, bid1);
      await marketplace.connect(account1).makeBid(1, bid2);
      await marketplace.connect(account2).makeBid(1, bid3);

    
      const seconds = duration * 60;
      await ethers.provider.send("evm_increaseTime", [seconds]);
      await ethers.provider.send("evm_mine", []);

      await marketplace.connect(account2).finishAuction(1);
      expect(await contractErc20.balanceOf(account1.address)).to.equal(initialBalance.add(bid3));
      expect(await contractErc20.balanceOf(account2.address)).to.equal(initialBalance.sub(bid3));
    });
  });


  describe("fuction cancelAuction", () => {

    it("Should rever if not owner", async () => {
      await marketplace.createItem(account1.address, uri);
      await contractErc721.connect(account1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(account1).listItemOnAuction(1, price);
      await expect(marketplace.connect(account1).cancelAuction(1)).to.be.revertedWith("Ownable: caller is not the owner");
    });

  });

});
