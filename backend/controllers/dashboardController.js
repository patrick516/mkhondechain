// Dashboard Controller
// Group-scoped analytics and admin tools.
// ─────────────────────────────────────────────────────────────

const prisma = require("../utils/prismaClient");
const getSettingsForGroup = require("../utils/getSettingsForGroup");
const sendSms = require("../utils/textbeeSms");
const logger = require("../utils/logger");

// Helper: build group-scoped where clause (for Group queries)
const buildGroupWhere = (req) => {
  const where = {};
  if (req.admin.role !== "superadmin" && req.admin.groupId) {
    where.id = req.admin.groupId;
  }
  return where;
};

// Re-nest flattened savingWindow fields for API response compatibility
const formatSettings = (settings) => ({
  ...settings,
  savingWindow: {
    enabled: settings.savingWindowEnabled,
    openTime: settings.savingWindowOpenTime,
    closeTime: settings.savingWindowCloseTime,
  },
});

// GET /api/dashboard/summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const groupWhere = buildGroupWhere(req);
    const groups = await prisma.group.findMany({ where: groupWhere });

    const groupIds = groups.map((g) => g.id);
    const members = await prisma.member.findMany({
      where: { groupId: { in: groupIds } },
    });

    const totalMembers = members.length;
    const totalSavings = members.reduce((sum, m) => sum + m.balance, 0);
    const totalLoanBalance = members.reduce((sum, m) => sum + m.loanBalance, 0);
    const totalBorrowed = members.reduce((sum, m) => sum + m.totalBorrowed, 0);
    const totalRepaid = members.reduce((sum, m) => sum + m.totalRepaid, 0);

    // Count pending loans
    const pendingLoans = await prisma.transaction.count({
      where: {
        groupId: { in: groupIds },
        type: "borrow",
        status: "pending",
      },
    });

    // Loans past their due date where the member still owes money —
    // the flag the dashboard was missing before.
    const overdueLoans = await prisma.transaction.count({
      where: {
        groupId: { in: groupIds },
        type: "borrow",
        status: "success",
        dueDate: { lt: new Date() },
        member: { loanBalance: { gt: 0 } },
      },
    });

    res.status(200).json({
      totalSavings,
      totalBorrowed,
      totalOwing: totalLoanBalance,
      totalRepaid,
      totalMembers,
      pendingLoans,
      overdueLoans,
      activeGroups: groups.filter((g) => g.status === "active").length,
    });
  } catch (err) {
    logger.error("DASHBOARD_SUMMARY_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
};

// GET /api/dashboard/settings
exports.getSettings = async (req, res) => {
  try {
    let groupId = req.query.groupId;

    // Regular admin uses their own group
    if (req.admin.role !== "superadmin") {
      groupId = req.admin.groupId;
    }

    // Superadmin with no groupId specified: default to their first group
    // (temporary — will be replaced once the superadmin group-management
    // UI exists and always passes an explicit groupId)
    if (!groupId && req.admin.role === "superadmin") {
      const firstGroup = await prisma.group.findFirst({
        orderBy: { createdAt: "asc" },
      });
      groupId = firstGroup?.id;
    }

    if (!groupId) {
      return res.status(400).json({ error: "Group ID required" });
    }

    const settings = await getSettingsForGroup(prisma, groupId);
    res.status(200).json(formatSettings(settings));
  } catch (err) {
    logger.error("GET_SETTINGS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

// PATCH /api/dashboard/settings
exports.updateSettings = async (req, res) => {
  try {
    const {
      groupId,
      repayDays,
      interestRate,
      minSaveAmount,
      maxLoanPercent,
      savingWindow,
    } = req.body;

    // Determine target group
    let targetGroupId = groupId;
    if (req.admin.role !== "superadmin") {
      targetGroupId = req.admin.groupId;
    }
    // Superadmin with no groupId specified: default to their first group
    if (!targetGroupId && req.admin.role === "superadmin") {
      const firstGroup = await prisma.group.findFirst({
        orderBy: { createdAt: "asc" },
      });
      targetGroupId = firstGroup?.id;
    }

    if (!targetGroupId) {
      return res.status(400).json({ error: "Group ID required" });
    }

    // Verify admin has access to this group
    if (
      req.admin.role !== "superadmin" &&
      req.admin.groupId !== targetGroupId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Ensure a settings record exists before updating
    await getSettingsForGroup(prisma, targetGroupId);

    const data = {};

    if (repayDays !== undefined) {
      if (repayDays < 1 || repayDays > 365) {
        return res.status(400).json({ error: "Repay days must be 1-365" });
      }
      data.repayDays = repayDays;
    }

    if (interestRate !== undefined) {
      if (interestRate < 0 || interestRate > 100) {
        return res.status(400).json({ error: "Interest rate must be 0-100" });
      }
      data.interestRate = interestRate;
    }

    if (minSaveAmount !== undefined) {
      if (minSaveAmount < 1) {
        return res
          .status(400)
          .json({ error: "Minimum save amount must be at least 1" });
      }
      data.minSaveAmount = minSaveAmount;
    }

    if (maxLoanPercent !== undefined) {
      if (maxLoanPercent < 0 || maxLoanPercent > 100) {
        return res
          .status(400)
          .json({ error: "Max loan percent must be 0-100" });
      }
      data.maxLoanPercent = maxLoanPercent;
    }

    if (savingWindow) {
      if (savingWindow.enabled !== undefined)
        data.savingWindowEnabled = savingWindow.enabled;
      if (savingWindow.openTime)
        data.savingWindowOpenTime = savingWindow.openTime;
      if (savingWindow.closeTime)
        data.savingWindowCloseTime = savingWindow.closeTime;
    }

    const settings = await prisma.systemSetting.update({
      where: { groupId: targetGroupId },
      data,
    });

    logger.info("SETTINGS_UPDATED", {
      groupId: targetGroupId,
      admin: req.admin.username,
      changes: Object.keys(req.body),
    });

    res.status(200).json({
      message: "Settings updated",
      settings: formatSettings(settings),
    });
  } catch (err) {
    logger.error("UPDATE_SETTINGS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to update settings" });
  }
};

// POST /api/dashboard/broadcast
exports.broadcastMessage = async (req, res) => {
  const { message, groupId } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  if (message.trim().length > 320) {
    return res.status(400).json({
      error: "Message too long. Maximum 320 characters (2 SMS).",
    });
  }

  try {
    // Determine target members
    const memberWhere = { status: "active" };

    if (groupId) {
      if (req.admin.role !== "superadmin" && req.admin.groupId !== groupId) {
        return res.status(403).json({ error: "Access denied" });
      }
      memberWhere.groupId = groupId;
    } else if (req.admin.role !== "superadmin") {
      memberWhere.groupId = req.admin.groupId;
    }

    const members = await prisma.member.findMany({
      where: memberWhere,
      select: { phone: true, firstName: true },
    });

    if (members.length === 0) {
      return res.status(400).json({ error: "No active members found" });
    }

    let sent = 0;
    let failed = 0;

    for (const member of members) {
      if (!member.phone) continue;
      try {
        await sendSms(member.phone, `MkhondeChain: ${message.trim()}`);
        sent++;
      } catch (smsErr) {
        failed++;
        logger.error("BROADCAST_SMS_FAILED", {
          phone: member.phone,
          error: smsErr.message,
        });
      }
    }

    // Save broadcast record to each relevant group's settings
    let targetGroupIds;
    if (groupId) {
      targetGroupIds = [groupId];
    } else if (req.admin.role === "superadmin") {
      const allGroups = await prisma.group.findMany({ select: { id: true } });
      targetGroupIds = allGroups.map((g) => g.id);
    } else {
      targetGroupIds = [req.admin.groupId];
    }

    for (const gid of targetGroupIds) {
      await getSettingsForGroup(prisma, gid);
      await prisma.systemSetting.update({
        where: { groupId: gid },
        data: {
          lastBroadcastMessage: message.trim(),
          lastBroadcastAt: new Date(),
        },
      });
    }

    logger.info("BROADCAST_SENT", {
      admin: req.admin.username,
      recipients: members.length,
      sent,
      failed,
    });

    res.status(200).json({
      message: `Message sent to ${sent} members`,
      sent,
      failed,
      total: members.length,
    });
  } catch (err) {
    logger.error("BROADCAST_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to send broadcast" });
  }
};

// GET /api/dashboard/recent-activity
exports.getRecentActivity = async (req, res) => {
  try {
    const where = {};
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      where.groupId = req.admin.groupId;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        member: { select: { firstName: true, surname: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const activity = transactions.map((tx) => ({
      member: tx.member
        ? `${tx.member.firstName} ${tx.member.surname}`
        : "Unknown",
      action: tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
      amount: `MK ${tx.amount.toLocaleString()}`,
      status: tx.status,
      reference: tx.reference,
      date: tx.createdAt,
    }));

    res.status(200).json(activity);
  } catch (err) {
    logger.error("DASHBOARD_ACTIVITY_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
};
