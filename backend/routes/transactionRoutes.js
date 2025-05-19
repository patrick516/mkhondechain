const express = require("express");
const router = express.Router();
const {
  getMemberTransactions,
  getTransactionSummary,
} = require("../controllers/transactionController");

router.get("/member/:memberId", getMemberTransactions);
router.get("/summary", getTransactionSummary);

module.exports = router;
