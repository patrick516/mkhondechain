const { ethers } = require("ethers");
require("dotenv").config();
const contractJson = require("../../smart-contract/artifacts/contracts/VillageSavings.sol/VillageSavings.json");

// ✅ Set the provider and connect explicitly to localhost
const provider = new ethers.providers.JsonRpcProvider(
  process.env.BLOCKCHAIN_URL,
  {
    name: "localhost",
    chainId: 31337, // default Hardhat network ID
  }
);

// ✅ Connect wallet
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ✅ Load contract
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractJson.abi,
  signer
);

// Optional: attach signer if you plan to call .connect()
contract.signer = signer;

module.exports = contract;
