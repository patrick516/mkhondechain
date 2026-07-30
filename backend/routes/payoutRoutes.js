// ─────────────────────────────────────────────────────────────
// File: backend/routes/payoutRoutes.js
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const {
  getPayoutHistory,
  exportPayoutsPdf,
} = require("../controllers/payoutController");

router.get("/", getPayoutHistory);
router.get("/export/pdf", exportPayoutsPdf);
module.exports = router;
