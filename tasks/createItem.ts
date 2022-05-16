import { task } from "hardhat/config";



task("createItem", "Creates marketplace nft token")
.addParam("from", "The contract address")
.addParam("to", "The recipient address")
.addParam("tokenuri", "The token URI")
.setAction(async (taskArgs, hre) => {

  const [signer] = await hre.ethers.getSigners();

  const marketplace = await hre.ethers.getContractAt("AnotherMarketplace", taskArgs.from);

  await marketplace.createItem(taskArgs.tokenuri, taskArgs.to);

  console.log(`Minted nft with metadata at ${taskArgs.tokenuri} to address ${taskArgs.to}`);
});