// ─────────────────────────────────────────────────────────────
// Dashboard Controller
// Group-scoped analytics and admin tools.
// ─────────────────────────────────────────────────────────────

const Member = require("../models/memberModel");
const Group = require("../models/Group");
const Transaction = require("../models/transactionModel");
const SystemSetting = require("../models/systemSettingModel");
const sendSms = require("../utils/africasTalkingSms");
const logger = require("../utils/logger");

// Helper: build group query
const buildGroupQuery = (req) => {
  const query = {};
  if (req.admin.role !== "superadmin" && req.admin.groupId) {
    query._id = req.admin.groupId;
  }
  return query;
};

// GET /api/dashboard/summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const groupQuery = buildGroupQuery(req);
    const groups = await Group.find(groupQuery);

    const groupIds = groups.map((g) => g._id);
    const members = await Member.find({ groupId: { $in: groupIds } });

    const totalMembers = members.length;
    const totalSavings = members.reduce((sum, m) => sum + m.balance, 0);
    const totalLoanBalance = members.reduce((sum, m) => sum + m.loanBalance, 0);
    const totalBorrowed = members.reduce((sum, m) => sum + m.totalBorrowed, 0);
    const totalRepaid = members.reduce((sum, m) => sum + m.totalRepaid, 0);

    // Count pending loans
    const pendingLoans = await Transaction.countDocuments({
      groupId: { $in: groupIds },
      type: "borrow",
      status: "pending",
    });

    res.status(200).json({
      totalSavings,
      totalBorrowed,
      totalOwing: totalLoanBalance,
      totalRepaid,
      totalMembers,
      pendingLoans,
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
      groupId = req.admin.groupId?.toString();
    }

    if (!groupId) {
      return res.status(400).json({ error: "Group ID required" });
    }

    const settings = await SystemSetting.getForGroup(groupId);
    res.status(200).json(settings);
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
      targetGroupId = req.admin.groupId?.toString();
    }

    if (!targetGroupId) {
      return res.status(400).json({ error: "Group ID required" });
    }

    // Verify admin has access to this group
    if (
      req.admin.role !== "superadmin" &&
      req.admin.groupId?.toString() !== targetGroupId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const settings = await SystemSetting.getForGroup(targetGroupId);

    if (repayDays !== undefined) {
      if (repayDays < 1 || repayDays > 365) {
        return res.status(400).json({ error: "Repay days must be 1-365" });
      }
      settings.repayDays = repayDays;
    }

    if (interestRate !== undefined) {
      if (interestRate < 0 || interestRate > 100) {
        return res.status(400).json({ error: "Interest rate must be 0-100" });
      }
      settings.interestRate = interestRate;
    }

    if (minSaveAmount !== undefined) {
      if (minSaveAmount < 1) {
        return res
          .status(400)
          .json({ error: "Minimum save amount must be at least 1" });
      }
      settings.minSaveAmount = minSaveAmount;
    }

    if (maxLoanPercent !== undefined) {
      if (maxLoanPercent < 0 || maxLoanPercent > 100) {
        return res
          .status(400)
          .json({ error: "Max loan percent must be 0-100" });
      }
      settings.maxLoanPercent = maxLoanPercent;
    }

    if (savingWindow) {
      if (savingWindow.enabled !== undefined)
        settings.savingWindow.enabled = savingWindow.enabled;
      if (savingWindow.openTime)
        settings.savingWindow.openTime = savingWindow.openTime;
      if (savingWindow.closeTime)
        settings.savingWindow.closeTime = savingWindow.closeTime;
    }

    await settings.save();

    logger.info("SETTINGS_UPDATED", {
      groupId: targetGroupId,
      admin: req.admin.username,
      changes: Object.keys(req.body),
    });

    res.status(200).json({
      message: "Settings updated",
      settings,
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
    let memberQuery = { status: "active" };

    if (groupId) {
      if (
        req.admin.role !== "superadmin" &&
        req.admin.groupId?.toString() !== groupId
      ) {
        return res.status(403).json({ error: "Access denied" });
      }
      memberQuery.groupId = groupId;
    } else if (req.admin.role !== "superadmin") {
      memberQuery.groupId = req.admin.groupId;
    }

    const members = await Member.find(memberQuery).select("phone firstName");

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
    const targetGroupIds = groupId
      ? [groupId]
      : req.admin.role === "superadmin"
        ? await Group.find().distinct("_id")
        : [req.admin.groupId];

    for (const gid of targetGroupIds) {
      const settings = await SystemSetting.getForGroup(gid);
      settings.lastBroadcastMessage = message.trim();
      settings.lastBroadcastAt = new Date();
      await settings.save();
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
    let groupQuery = {};
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      groupQuery = { groupId: req.admin.groupId };
    }

    const transactions = await Transaction.find(groupQuery)
      .populate("member", "firstName surname")
      .sort({ createdAt: -1 })
      .limit(20);

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
