// ─────────────────────────────────────────────────────────────
// Transaction Routes
// Financial history and analytics.
// Group-scoped for regular admins.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const {
  getMemberTransactions,
  getGroupTransactions,
  getTransactionSummary,
  getTotalSavings,
  getTotalBorrowed,
  getTotalOutstanding,
  getRecentActivity,
  getPendingLoans,
} = require("../controllers/transactionController");

// Member's transaction history (with pagination)
router.get("/member/:memberId", getMemberTransactions);

// Group's transaction history (with pagination)
router.get("/group/:groupId", getGroupTransactions);

// Summary statistics
router.get("/summary", getTransactionSummary);

// Aggregates
router.get("/total-savings", getTotalSavings);
router.get("/total-borrowed", getTotalBorrowed);
router.get("/total-owing", getTotalOutstanding);

// Recent activity feed
router.get("/recent", getRecentActivity);

// Pending loan requests (for group leader approval)
router.get("/pending-loans", getPendingLoans);

module.exports = router;
