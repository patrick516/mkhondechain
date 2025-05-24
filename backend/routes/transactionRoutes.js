const express = require("express");
const router = express.Router();
const {
  getMemberTransactions,
  getTransactionSummary,
  getTotalSavings,
  getTotalBorrowed,
  getTotalOutstanding,
  getRecentActivity,
  getLoanRequests,
} = require("../controllers/transactionController");

router.get("/member/:memberId", getMemberTransactions);
router.get("/summary", getTransactionSummary);
router.get("/total-savings", getTotalSavings);
router.get("/total-borrowed", getTotalBorrowed);
router.get("/total-owing", getTotalOutstanding);
router.get("/recent", getRecentActivity);
router.get("/loan-requests", getLoanRequests);

module.exports = router;
