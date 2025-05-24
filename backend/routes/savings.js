const express = require("express");
const router = express.Router();
const savingsController = require("../controllers/savingsController");

// Balance and smart contract interactions
router.get("/balance/:address", savingsController.getBalanceForAPI);
router.post("/contract-deposit", savingsController.deposit); // renamed
router.post("/borrow", savingsController.borrow);
router.post("/repay", savingsController.repay);

module.exports = router;
