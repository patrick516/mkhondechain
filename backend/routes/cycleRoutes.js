const express = require("express");
const router = express.Router();
const {
  getCycleStatus,
  startCycle,
  getShareoutPreview,
  closeCycle,
} = require("../controllers/cycleController");

router.get("/", getCycleStatus);
router.post("/start", startCycle);
router.get("/shareout-preview", getShareoutPreview);
router.post("/close", closeCycle);
module.exports = router;
