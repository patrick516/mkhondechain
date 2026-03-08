const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

const contractJson = require("../../smart-contract/artifacts/contracts/VillageSavings.sol/VillageSavings.json");
const provider = new ethers.providers.JsonRpcProvider(
  process.env.BLOCKCHAIN_URL
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractJson.abi,
  wallet
);

module.exports = contract;
