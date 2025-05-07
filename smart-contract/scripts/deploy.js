const hre = require("hardhat");

async function main() {
  const VillageSavings = await hre.ethers.getContractFactory("VillageSavings");
  const contract = await VillageSavings.deploy();
  await contract.deployed();
  console.log("Contract deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
