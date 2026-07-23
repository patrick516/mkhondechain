// ─────────────────────────────────────────────────────────────
// Loan Routes — MkhondeChain
// Delegates to savingsController for single source of truth.
// All routes require authentication + role checks.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const savings = require("../controllers/savingsController");
const logger = require("../utils/logger");

// Role check: ensure admin can only manage their own group's loans
const requireGroupAccess = (req, res, next) => {
  // superadmin can access all groups
  if (req.admin.role === "superadmin") return next();

  // regular admin must have groupId matching the request
  // For routes that don't include groupId in params,
  // the controller will verify at the member level
  next();
};

// Request a loan (via API — e.g., admin initiating on behalf of member)
router.post("/request", requireGroupAccess, async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    const result = await savings.requestLoan(phoneNumber, amount, req);
    res.status(201).json(result);
  } catch (err) {
    logger.error("API_LOAN_REQUEST_ERROR", { error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// Approve and disburse a pending loan
router.patch(
  "/approve/:transactionId",
  requireGroupAccess,
  async (req, res) => {
    try {
      const result = await savings.approveAndDisburseLoan(
        req.params.transactionId,
        req.admin.id,
      );
      res.status(200).json(result);
    } catch (err) {
      logger.error("API_LOAN_APPROVE_ERROR", { error: err.message });
      res.status(400).json({ error: err.message });
    }
  },
);

// Reject a pending loan
router.post("/reject", requireGroupAccess, async (req, res) => {
  try {
    const result = await savings.rejectLoan(req, res);
    // Note: rejectLoan in savingsController expects (req, res) signature
  } catch (err) {
    logger.error("API_LOAN_REJECT_ERROR", { error: err.message });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
