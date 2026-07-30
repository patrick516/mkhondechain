const express = require("express");
const router = express.Router();
const requireSuperadmin = require("../middleware/requireSuperadmin");
const {
  createGroup,
  listGroups,
  resetLeaderPassword,
  updateGroupStatus,
  getSystemStats,
  getGroupAnalytics,
  getReconciliationConfig,
  updateReconciliationConfig,
} = require("../controllers/groupController");

router.get("/", requireSuperadmin, listGroups);
router.get("/stats", requireSuperadmin, getSystemStats);
router.get("/analytics", requireSuperadmin, getGroupAnalytics);
router.get(
  "/reconciliation-config",
  requireSuperadmin,
  getReconciliationConfig,
);
router.patch(
  "/reconciliation-config",
  requireSuperadmin,
  updateReconciliationConfig,
);
router.post("/", requireSuperadmin, createGroup);
router.patch(
  "/:groupId/reset-leader-password",
  requireSuperadmin,
  resetLeaderPassword,
);
router.patch("/:groupId/status", requireSuperadmin, updateGroupStatus);

module.exports = router;
