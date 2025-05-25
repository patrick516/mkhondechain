const express = require("express");
const router = express.Router();
const Audit = require("../models/auditModel");

router.get("/", async (req, res) => {
  try {
    const logs = await Audit.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    console.error("Audit fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

module.exports = router;
