// ─────────────────────────────────────────────────────────────
// Transaction Controller
// Financial history and analytics.
// Group-scoped for regular admins.
// ─────────────────────────────────────────────────────────────

const Transaction = require("../models/transactionModel");
const Member = require("../models/memberModel");
const Group = require("../models/Group");
const logger = require("../utils/logger");

// Helper: build group-scoped query
const buildGroupQuery = (req) => {
  const query = {};
  if (req.admin.role !== "superadmin" && req.admin.groupId) {
    query.groupId = req.admin.groupId;
  }
  return query;
};

// GET /api/transactions/member/:memberId
exports.getMemberTransactions = async (req, res) => {
  try {
    const { memberId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const member = await Member.findById(memberId).select("-pinHash");
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Group scoping check
    if (
      req.admin.role !== "superadmin" &&
      req.admin.groupId &&
      member.groupId.toString() !== req.admin.groupId.toString()
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const transactions = await Transaction.find({ member: memberId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments({ member: memberId });

    res.status(200).json({
      member: {
        fullName: `${member.firstName} ${member.surname}`,
        phone: member.phone,
        balance: member.balance,
        loanBalance: member.loanBalance,
        joined: member.createdAt,
      },
      transactions: transactions.map((tx) => ({
        reference: tx.reference,
        date: tx.createdAt,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        method: tx.method,
        beforeBalance: tx.beforeBalance,
        afterBalance: tx.afterBalance,
        note: tx.note,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("GET_MEMBER_TRANSACTIONS_ERROR", {
      error: error.message,
      memberId: req.params.memberId,
      admin: req.admin.username,
    });
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

// GET /api/transactions/group/:groupId
exports.getGroupTransactions = async (req, res) => {
  try {
    const { groupId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Group access check
    if (
      req.admin.role !== "superadmin" &&
      req.admin.groupId &&
      groupId !== req.admin.groupId.toString()
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const query = { groupId };
    const type = req.query.type;
    if (type && ["save", "borrow", "repay", "interest"].includes(type)) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .populate("member", "firstName surname phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      transactions: transactions.map((tx) => ({
        reference: tx.reference,
        member: tx.member
          ? `${tx.member.firstName} ${tx.member.surname}`
          : "Unknown",
        phone: tx.member?.phone,
        date: tx.createdAt,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        method: tx.method,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("GET_GROUP_TRANSACTIONS_ERROR", {
      error: error.message,
      groupId: req.params.groupId,
    });
    res.status(500).json({ error: "Failed to fetch group transactions" });
  }
};

// GET /api/transactions/summary
exports.getTransactionSummary = async (req, res) => {
  try {
    const groupQuery = buildGroupQuery(req);

    const members = await Member.find(groupQuery).select("-pinHash");

    const summary = await Promise.all(
      members.map(async (member) => {
        const transactions = await Transaction.find({
          member: member._id,
          status: "success",
        });

        const totalSavings = transactions
          .filter((t) => t.type === "save")
          .reduce((sum, t) => sum + t.amount, 0);

        const totalBorrowed = transactions
          .filter((t) => t.type === "borrow")
          .reduce((sum, t) => sum + t.amount, 0);

        const totalRepaid = transactions
          .filter((t) => t.type === "repay")
          .reduce((sum, t) => sum + t.amount, 0);

        const totalInterest = transactions
          .filter((t) => t.type === "interest")
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          _id: member._id,
          firstName: member.firstName,
          surname: member.surname,
          phone: member.phone,
          balance: member.balance,
          loanBalance: member.loanBalance,
          totalSavings,
          totalBorrowed,
          totalRepaid,
          totalInterest,
          netPosition: totalSavings + totalInterest - member.loanBalance,
        };
      }),
    );

    res.status(200).json(summary);
  } catch (err) {
    logger.error("GET_TRANSACTION_SUMMARY_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to load summary" });
  }
};

// GET /api/transactions/total-savings
exports.getTotalSavings = async (req, res) => {
  try {
    const groupQuery = buildGroupQuery(req);
    const memberIds = await Member.find(groupQuery).distinct("_id");

    const result = await Transaction.aggregate([
      {
        $match: { member: { $in: memberIds }, type: "save", status: "success" },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({ totalSavings: result[0]?.total || 0 });
  } catch (err) {
    logger.error("GET_TOTAL_SAVINGS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to get total savings" });
  }
};

// GET /api/transactions/total-borrowed
exports.getTotalBorrowed = async (req, res) => {
  try {
    const groupQuery = buildGroupQuery(req);
    const memberIds = await Member.find(groupQuery).distinct("_id");

    const result = await Transaction.aggregate([
      {
        $match: {
          member: { $in: memberIds },
          type: "borrow",
          status: "success",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({ totalBorrowed: result[0]?.total || 0 });
  } catch (err) {
    logger.error("GET_TOTAL_BORROWED_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to get total borrowed" });
  }
};

// GET /api/transactions/total-owing
exports.getTotalOutstanding = async (req, res) => {
  try {
    const groupQuery = buildGroupQuery(req);
    const members = await Member.find(groupQuery);

    const totalOwing = members.reduce((sum, m) => sum + m.loanBalance, 0);

    res.status(200).json({ totalOwing });
  } catch (err) {
    logger.error("GET_TOTAL_OWING_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to get total owing" });
  }
};

// GET /api/transactions/recent
exports.getRecentActivity = async (req, res) => {
  try {
    const groupQuery = buildGroupQuery(req);
    const memberIds = await Member.find(groupQuery).distinct("_id");

    const recent = await Transaction.find({ member: { $in: memberIds } })
      .populate("member", "firstName surname")
      .sort({ createdAt: -1 })
      .limit(20);

    const activity = recent.map((tx) => ({
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
    logger.error("GET_RECENT_ACTIVITY_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
};

// GET /api/transactions/pending-loans
exports.getPendingLoans = async (req, res) => {
  try {
    const groupQuery = buildGroupQuery(req);
    const memberIds = await Member.find(groupQuery).distinct("_id");

    const pending = await Transaction.find({
      member: { $in: memberIds },
      type: "borrow",
      status: "pending",
    })
      .populate("member", "firstName surname phone")
      .sort({ createdAt: -1 });

    const formatted = pending.map((tx) => ({
      transactionId: tx._id,
      reference: tx.reference,
      member: tx.member
        ? `${tx.member.firstName} ${tx.member.surname}`
        : "Unknown",
      phone: tx.member?.phone,
      amount: tx.amount,
      date: tx.createdAt,
      status: tx.status,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    logger.error("GET_PENDING_LOANS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch pending loans" });
  }
};
