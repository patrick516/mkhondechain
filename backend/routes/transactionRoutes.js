const express = require("express");
const router = express.Router();
const {
  getMemberTransactions,
  getTransactionSummary,
  getTotalSavings,
} = require("../controllers/transactionController");

router.get("/member/:memberId", getMemberTransactions);
router.get("/summary", getTransactionSummary);
router.get("/total-savings", getTotalSavings);

module.exports = router;
