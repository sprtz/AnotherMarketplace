import { ethers } from "hardhat";
import * as dotenv from "dotenv";


dotenv.config();




async function main() {
  const erc721Token = process.env.ERC721_TOKEN_ADDRESS as string;
  const erc20token = process.env.ERC20_TOKEN_ADDRESS as string;
  const factory = await ethers.getContractFactory("AnotherMarketplace");
  const marketplaceContract = await factory.deploy(erc721Token, erc20token);

  await marketplaceContract.deployed();

  console.log("Marketplace contract deployed to:", marketplaceContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
