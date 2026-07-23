// ─────────────────────────────────────────────────────────────
// Audit Routes
// Security log access — restricted to superadmins.
// Regular admins can only see their group's audits.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const Audit = require("../models/auditModel");
const logger = require("../utils/logger");

// GET /audit — list audit logs with filtering
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    // Group scoping
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      query.groupId = req.admin.groupId;
    } else if (req.query.groupId) {
      query.groupId = req.query.groupId;
    }

    // Filter by action
    if (req.query.action) {
      query.action = req.query.action;
    }

    // Filter by severity
    if (req.query.severity) {
      query.severity = req.query.severity;
    }

    // Filter by date range
    if (req.query.fromDate || req.query.toDate) {
      query.createdAt = {};
      if (req.query.fromDate)
        query.createdAt.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) query.createdAt.$lte = new Date(req.query.toDate);
    }

    // Filter by admin
    if (req.query.adminId) {
      query.performedBy = req.query.adminId;
    }

    const [logs, total] = await Promise.all([
      Audit.find(query)
        .populate("performedBy", "username fullName")
        .populate("targetMember", "firstName surname phone")
        .populate("groupId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Audit.countDocuments(query),
    ]);

    res.status(200).json({
      logs: logs.map((log) => ({
        id: log._id,
        action: log.action,
        severity: log.severity,
        performedBy: log.performedBy
          ? `${log.performedBy.username} (${log.performedBy.fullName})`
          : log.performedByName,
        targetMember: log.targetMember
          ? `${log.targetMember.firstName} ${log.targetMember.surname}`
          : log.targetMemberPhone,
        group: log.groupId?.name,
        details: Object.fromEntries(log.details),
        ipAddress: log.ipAddress,
        status: log.status,
        errorMessage: log.errorMessage,
        date: log.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error("AUDIT_FETCH_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// GET /audit/stats — summary statistics
router.get("/stats", async (req, res) => {
  try {
    const query = {};
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      query.groupId = req.admin.groupId;
    }

    const stats = await Audit.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
          lastOccurrence: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const severityStats = await Audit.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      actionBreakdown: stats,
      severityBreakdown: severityStats,
    });
  } catch (err) {
    logger.error("AUDIT_STATS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch audit stats" });
  }
});

module.exports = router;
