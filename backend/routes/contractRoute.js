const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const contract = require("../services/contract"); // adjust if your contract instance is elsewhere

// GET /contract/eligible-to-borrow/:wallet
router.get("/eligible-to-borrow/:wallet", async (req, res) => {
  const { wallet } = req.params;

  try {
    const [, , , eligibleToBorrow] = await contract.getBalance(wallet);
    const eligibleMWK =
      parseFloat(ethers.utils.formatEther(eligibleToBorrow)) * 1000;

    res.json({ eligibleMWK: Math.floor(eligibleMWK) });
  } catch (err) {
    console.error("Error in eligible-to-borrow route:", err.message);
    res.status(500).json({ error: "Failed to fetch eligible amount" });
  }
});

module.exports = router;
