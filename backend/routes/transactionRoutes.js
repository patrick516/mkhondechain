const express = require("express");
const router = express.Router();
const {
  getMemberTransactions,
  getTransactionSummary,
  getTotalSavings,
  getTotalBorrowed,
  getTotalOutstanding,
} = require("../controllers/transactionController");

router.get("/member/:memberId", getMemberTransactions);
router.get("/summary", getTransactionSummary);
router.get("/total-savings", getTotalSavings);
router.get("/total-borrowed", getTotalBorrowed);
router.get("/total-owing", getTotalOutstanding);

module.exports = router;
