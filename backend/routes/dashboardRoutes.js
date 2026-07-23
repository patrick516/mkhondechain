// ─────────────────────────────────────────────────────────────
// Dashboard Routes
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// Summary stats
router.get("/summary", dashboardController.getDashboardSummary);

// Recent activity
router.get("/recent-activity", dashboardController.getRecentActivity);

// System settings
router.get("/settings", dashboardController.getSettings);
router.patch("/settings", dashboardController.updateSettings);

// Broadcast SMS to all members
router.post("/broadcast", dashboardController.broadcastMessage);

module.exports = router;
