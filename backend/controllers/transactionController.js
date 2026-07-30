// ─────────────────────────────────────────────────────────────
// File: backend/controllers/transactionController.js
// ─────────────────────────────────────────────────────────────
// Transaction Controller
// Financial history and analytics.
// Group-scoped for regular admins.
// ─────────────────────────────────────────────────────────────

const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");

// Helper: build group-scoped where clause (for Member queries)
const buildGroupWhere = (req) => {
  const where = {};
  if (req.admin.role !== "superadmin" && req.admin.groupId) {
    where.groupId = req.admin.groupId;
  }
  return where;
};

// GET /api/transactions/member/:memberId
exports.getMemberTransactions = async (req, res) => {
  try {
    const { memberId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      omit: { pinHash: true },
    });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Group scoping check
    if (
      req.admin.role !== "superadmin" &&
      req.admin.groupId &&
      member.groupId !== req.admin.groupId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { memberId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: { memberId } }),
    ]);

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
      groupId !== req.admin.groupId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const where = { groupId };
    const type = req.query.type;
    if (type && ["save", "borrow", "repay", "interest", "fee"].includes(type)) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          member: { select: { firstName: true, surname: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

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
    const groupWhere = buildGroupWhere(req);
    const members = await prisma.member.findMany({
      where: groupWhere,
      omit: { pinHash: true },
    });

    const summary = await Promise.all(
      members.map(async (member) => {
        const transactions = await prisma.transaction.findMany({
          where: { memberId: member.id, status: "success" },
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
          _id: member.id,
          firstName: member.firstName,
          surname: member.surname,
          phone: member.phone,
          balance: member.balance,
          loanBalance: member.loanBalance,
          totalSaved: totalSavings,
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
    const groupWhere = buildGroupWhere(req);
    const members = await prisma.member.findMany({
      where: groupWhere,
      select: { id: true },
    });
    const memberIds = members.map((m) => m.id);

    const result = await prisma.transaction.aggregate({
      where: { memberId: { in: memberIds }, type: "save", status: "success" },
      _sum: { amount: true },
    });

    res.status(200).json({ totalSavings: result._sum.amount || 0 });
  } catch (err) {
    logger.error("GET_TOTAL_SAVINGS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to get total savings" });
  }
};

// GET /api/transactions/total-borrowed
exports.getTotalBorrowed = async (req, res) => {
  try {
    const groupWhere = buildGroupWhere(req);
    const members = await prisma.member.findMany({
      where: groupWhere,
      select: { id: true },
    });
    const memberIds = members.map((m) => m.id);

    const result = await prisma.transaction.aggregate({
      where: {
        memberId: { in: memberIds },
        type: "borrow",
        status: "success",
      },
      _sum: { amount: true },
    });

    res.status(200).json({ totalBorrowed: result._sum.amount || 0 });
  } catch (err) {
    logger.error("GET_TOTAL_BORROWED_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to get total borrowed" });
  }
};

// GET /api/transactions/total-owing
exports.getTotalOutstanding = async (req, res) => {
  try {
    const groupWhere = buildGroupWhere(req);

    const result = await prisma.member.aggregate({
      where: groupWhere,
      _sum: { loanBalance: true },
    });

    res.status(200).json({ totalOwing: result._sum.loanBalance || 0 });
  } catch (err) {
    logger.error("GET_TOTAL_OWING_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to get total owing" });
  }
};

// GET /api/transactions/recent
exports.getRecentActivity = async (req, res) => {
  try {
    const groupWhere = buildGroupWhere(req);
    const members = await prisma.member.findMany({
      where: groupWhere,
      select: { id: true },
    });
    const memberIds = members.map((m) => m.id);

    const recent = await prisma.transaction.findMany({
      where: { memberId: { in: memberIds } },
      include: {
        member: { select: { firstName: true, surname: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

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
    const groupWhere = buildGroupWhere(req);
    const members = await prisma.member.findMany({
      where: groupWhere,
      select: { id: true },
    });
    const memberIds = members.map((m) => m.id);

    const pending = await prisma.transaction.findMany({
      where: {
        memberId: { in: memberIds },
        type: "borrow",
        status: "pending",
      },
      include: {
        member: { select: { firstName: true, surname: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = pending.map((tx) => ({
      transactionId: tx.id,
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

// GET /api/transactions/platform-fees — superadmin only, system-wide
exports.getPlatformFeesSummary = async (req, res) => {
  try {
    if (req.admin.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const config = await prisma.systemConfig.findUnique({
      where: { id: "singleton" },
    });

    const byGroup = await prisma.transaction.groupBy({
      by: ["groupId"],
      where: { type: "fee", status: "success" },
      _sum: { amount: true },
      _count: { id: true },
    });

    const groups = await prisma.group.findMany({
      where: { id: { in: byGroup.map((g) => g.groupId) } },
      select: { id: true, name: true },
    });
    const groupNameMap = new Map(groups.map((g) => [g.id, g.name]));

    res.status(200).json({
      totalPlatformFeesCollected: config?.totalPlatformFeesCollected || 0,
      byGroup: byGroup.map((g) => ({
        groupId: g.groupId,
        groupName: groupNameMap.get(g.groupId) || "Unknown",
        totalFees: g._sum.amount || 0,
        feeTransactionCount: g._count.id,
      })),
    });
  } catch (err) {
    logger.error("GET_PLATFORM_FEES_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch platform fees summary" });
  }
};
