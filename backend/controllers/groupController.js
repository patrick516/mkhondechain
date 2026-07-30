// Group Controller — Superadmin only.
// Creates a village bank group together with its dedicated
// leader admin account, atomically, in one request.
// ─────────────────────────────────────────────────────────────
const bcrypt = require("bcrypt");
const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");
const {
  createGroupSchema,
  resetLeaderPasswordSchema,
  updateGroupStatusSchema,
} = require("../utils/validators");

const SALT_ROUNDS = 12;

// POST /api/groups — create group + leader, atomically
exports.createGroup = async (req, res) => {
  const { error, value } = createGroupSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const {
    name,
    location,
    leaderUsername,
    leaderFullName,
    leaderPassword,
    leaderPhone,
  } = value;

  try {
    const passwordHash = await bcrypt.hash(leaderPassword, SALT_ROUNDS);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the leader admin (groupId null for now)
      const leader = await tx.admin.create({
        data: {
          username: leaderUsername.toLowerCase().trim(),
          passwordHash,
          fullName: leaderFullName.trim(),
          phone: leaderPhone || null,
          role: "admin",
        },
      });

      // 2. Create the group, pointing leaderId at the new admin
      const group = await tx.group.create({
        data: {
          name: name.trim(),
          location: location.trim(),
          leaderId: leader.id,
        },
      });

      // 3. Create default settings for the group
      await tx.systemSetting.create({ data: { groupId: group.id } });

      // 4. Patch the leader's own groupId back to the new group
      const updatedLeader = await tx.admin.update({
        where: { id: leader.id },
        data: { groupId: group.id },
      });

      return { group, leader: updatedLeader };
    });

    logger.info("GROUP_CREATED", {
      groupId: result.group.id,
      name: result.group.name,
      leader: result.leader.username,
      createdBy: req.admin.username,
    });

    res.status(201).json({
      message: "Group created successfully",
      group: result.group,
      leader: {
        id: result.leader.id,
        username: result.leader.username,
        fullName: result.leader.fullName,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "field";
      return res.status(400).json({
        error:
          field === "username"
            ? "That username already exists. Choose a different one."
            : "A group with this name already exists.",
      });
    }
    logger.error("CREATE_GROUP_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to create group" });
  }
};

// GET /api/groups — list all groups (superadmin only)
exports.listGroups = async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        leader: { select: { username: true, fullName: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        location: g.location,
        status: g.status,
        leader: g.leader
          ? `${g.leader.username} (${g.leader.fullName})`
          : "Unassigned",
        memberCount: g._count.members,
        fundBalance: g.fundBalance,
        createdAt: g.createdAt,
      })),
    );
  } catch (err) {
    logger.error("LIST_GROUPS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

// PATCH /api/groups/:groupId/reset-leader-password
exports.resetLeaderPassword = async (req, res) => {
  const { error, value } = resetLeaderPasswordSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.groupId },
      include: { leader: { select: { id: true, username: true } } },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!group.leader) {
      return res
        .status(400)
        .json({ error: "This group has no assigned leader" });
    }

    const passwordHash = await bcrypt.hash(value.newPassword, SALT_ROUNDS);

    await prisma.admin.update({
      where: { id: group.leader.id },
      data: {
        passwordHash,
        loginAttempts: 0,
        lockUntil: null,
      },
    });

    logger.info("LEADER_PASSWORD_RESET", {
      groupId: group.id,
      leaderUsername: group.leader.username,
      resetBy: req.admin.username,
    });

    res.status(200).json({
      message: `Password reset for ${group.leader.username}`,
    });
  } catch (err) {
    logger.error("RESET_LEADER_PASSWORD_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to reset password" });
  }
};

// PATCH /api/groups/:groupId/status — suspend or reactivate a group
exports.updateGroupStatus = async (req, res) => {
  const { error, value } = updateGroupStatusSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.groupId },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const updated = await prisma.group.update({
      where: { id: group.id },
      data: { status: value.status },
    });

    logger.info("GROUP_STATUS_CHANGED", {
      groupId: group.id,
      groupName: group.name,
      from: group.status,
      to: value.status,
      changedBy: req.admin.username,
    });

    res.status(200).json({
      message: `${group.name} is now ${value.status}`,
      group: updated,
    });
  } catch (err) {
    logger.error("UPDATE_GROUP_STATUS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to update group status" });
  }
};

// GET /api/groups/stats — system-wide totals across all groups
exports.getSystemStats = async (req, res) => {
  try {
    const [groupCounts, memberStats, pendingLoans] = await Promise.all([
      prisma.group.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.member.aggregate({
        _count: { id: true },
        _sum: {
          balance: true,
          loanBalance: true,
          totalSaved: true,
          totalRepaid: true,
        },
      }),
      prisma.transaction.count({
        where: { type: "borrow", status: "pending" },
      }),
    ]);

    const totalGroups = groupCounts.reduce(
      (sum, g) => sum + g._count.status,
      0,
    );
    const activeGroups =
      groupCounts.find((g) => g.status === "active")?._count.status || 0;

    res.status(200).json({
      totalGroups,
      activeGroups,
      totalMembers: memberStats._count.id || 0,
      totalSystemSavings: memberStats._sum.balance || 0,
      totalOutstandingLoans: memberStats._sum.loanBalance || 0,
      totalEverSaved: memberStats._sum.totalSaved || 0,
      totalEverRepaid: memberStats._sum.totalRepaid || 0,
      pendingLoansAcrossAllGroups: pendingLoans,
    });
  } catch (err) {
    logger.error("SYSTEM_STATS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to load system stats" });
  }
};
// GET /api/groups/analytics — per-group breakdown + 30-day savings trend
// for superadmin dashboard charts (doughnut, bar, leaderboard, trend line).
// Sources the same "current balance" figure StatsCards already shows, so
// the charts always add up to the same System Savings total.
exports.getGroupAnalytics = async (req, res) => {
  try {
    const [groups, memberTotals, saveTransactions] = await Promise.all([
      prisma.group.findMany({
        select: {
          id: true,
          name: true,
          location: true,
          status: true,
          _count: { select: { members: true } },
        },
      }),
      prisma.member.groupBy({
        by: ["groupId"],
        _sum: { balance: true, loanBalance: true },
      }),
      prisma.transaction.findMany({
        where: {
          type: "save",
          status: "success",
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: { amount: true, createdAt: true },
      }),
    ]);

    const totalsByGroup = new Map(memberTotals.map((m) => [m.groupId, m._sum]));

    const groupBreakdown = groups
      .map((g) => ({
        id: g.id,
        name: g.name,
        location: g.location,
        memberCount: g._count.members,
        totalSaved: totalsByGroup.get(g.id)?.balance || 0,
        outstandingLoans: totalsByGroup.get(g.id)?.loanBalance || 0,
      }))
      .sort((a, b) => b.totalSaved - a.totalSaved);

    // 30-day system-wide savings trend, one point per calendar day
    const trendMap = new Map();
    for (const tx of saveTransactions) {
      const day = tx.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      trendMap.set(day, (trendMap.get(day) || 0) + tx.amount);
    }
    const trend = Array.from(trendMap.entries())
      .map(([date, totalSaved]) => ({ date, totalSaved }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    res.status(200).json({ groups: groupBreakdown, trend });
  } catch (err) {
    logger.error("GROUP_ANALYTICS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to load group analytics" });
  }
};

// GET /api/groups/reconciliation-config — superadmin only
exports.getReconciliationConfig = async (req, res) => {
  try {
    const config = await prisma.systemConfig.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    res.status(200).json(config);
  } catch (err) {
    logger.error("GET_RECONCILIATION_CONFIG_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to load reconciliation config" });
  }
};

// PATCH /api/groups/reconciliation-config — superadmin only
exports.updateReconciliationConfig = async (req, res) => {
  const { knownMobileMoneyBalance } = req.body;

  if (
    typeof knownMobileMoneyBalance !== "number" ||
    knownMobileMoneyBalance < 0
  ) {
    return res
      .status(400)
      .json({ error: "knownMobileMoneyBalance must be a non-negative number" });
  }

  try {
    const config = await prisma.systemConfig.upsert({
      where: { id: "singleton" },
      update: {
        knownMobileMoneyBalance,
        updatedByUsername: req.admin.username,
      },
      create: {
        id: "singleton",
        knownMobileMoneyBalance,
        updatedByUsername: req.admin.username,
      },
    });

    logger.info("RECONCILIATION_CONFIG_UPDATED", {
      knownMobileMoneyBalance,
      updatedBy: req.admin.username,
    });

    res.status(200).json({ message: "Reconciliation config updated", config });
  } catch (err) {
    logger.error("UPDATE_RECONCILIATION_CONFIG_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to update reconciliation config" });
  }
};
