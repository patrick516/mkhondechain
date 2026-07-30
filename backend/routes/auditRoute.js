// Audit Routes
// Security log access — restricted to superadmins.
// Regular admins can only see their group's audits.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");

// GET /audit — list audit logs with filtering
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};

    // Group scoping
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      where.groupId = req.admin.groupId;
    } else if (req.query.groupId) {
      where.groupId = req.query.groupId;
    }

    // Filter by action
    if (req.query.action) {
      where.action = req.query.action;
    }

    // Filter by severity
    if (req.query.severity) {
      where.severity = req.query.severity;
    }

    // Filter by date range
    if (req.query.fromDate || req.query.toDate) {
      where.createdAt = {};
      if (req.query.fromDate)
        where.createdAt.gte = new Date(req.query.fromDate);
      if (req.query.toDate) where.createdAt.lte = new Date(req.query.toDate);
    }

    // Filter by admin
    if (req.query.adminId) {
      where.performedById = req.query.adminId;
    }

    const [logs, total] = await Promise.all([
      prisma.audit.findMany({
        where,
        include: {
          performedBy: { select: { username: true, fullName: true } },
          targetMember: {
            select: { firstName: true, surname: true, phone: true },
          },
          group: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.audit.count({ where }),
    ]);

    res.status(200).json({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        severity: log.severity,
        performedBy: log.performedBy
          ? `${log.performedBy.username} (${log.performedBy.fullName})`
          : log.performedByName,
        targetMember: log.targetMember
          ? `${log.targetMember.firstName} ${log.targetMember.surname}`
          : log.targetMemberPhone,
        group: log.group?.name,
        details: log.details || {},
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
    const where = {};
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      where.groupId = req.admin.groupId;
    }

    const actionGroups = await prisma.audit.groupBy({
      by: ["action"],
      where,
      _count: { action: true },
      _max: { createdAt: true },
      orderBy: { _count: { action: "desc" } },
    });

    const severityGroups = await prisma.audit.groupBy({
      by: ["severity"],
      where,
      _count: { severity: true },
    });

    res.status(200).json({
      actionBreakdown: actionGroups.map((g) => ({
        _id: g.action,
        count: g._count.action,
        lastOccurrence: g._max.createdAt,
      })),
      severityBreakdown: severityGroups.map((g) => ({
        _id: g.severity,
        count: g._count.severity,
      })),
    });
  } catch (err) {
    logger.error("AUDIT_STATS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch audit stats" });
  }
});

module.exports = router;
