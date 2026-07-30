// Cycle Controller
// Manages a group's savings cycle: start, and status/countdown.
// Closing a cycle (share-out) is a separate, later phase — this
// only covers starting one and checking its current state.
// ─────────────────────────────────────────────────────────────

const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");
const { startCycleSchema } = require("../utils/validators");
const { computeShareoutPreview } = require("../utils/shareout");

// GET /api/cycle — current cycle status for the caller's group
exports.getCycleStatus = async (req, res) => {
  try {
    const groupId = req.admin.groupId;
    if (!groupId) {
      return res
        .status(400)
        .json({ error: "No group associated with this account" });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    let daysRemaining = null;
    if (group.cycleActive && group.cycleEndDate) {
      const msRemaining = new Date(group.cycleEndDate).getTime() - Date.now();
      daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    }

    res.status(200).json({
      cycleActive: group.cycleActive,
      cycleStartDate: group.cycleStartDate,
      cycleEndDate: group.cycleEndDate,
      daysRemaining,
    });
  } catch (err) {
    logger.error("GET_CYCLE_STATUS_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch cycle status" });
  }
};

// POST /api/cycle/start — chair starts a new cycle
exports.startCycle = async (req, res) => {
  const { error, value } = startCycleSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const groupId = req.admin.groupId;
    if (!groupId) {
      return res
        .status(400)
        .json({ error: "No group associated with this account" });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.cycleActive) {
      return res.status(400).json({
        error: "A cycle is already active. Close it before starting a new one.",
      });
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        cycleActive: true,
        cycleStartDate: new Date(value.cycleStartDate),
        cycleEndDate: new Date(value.cycleEndDate),
      },
    });

    logger.info("CYCLE_STARTED", {
      groupId,
      startedBy: req.admin.username,
      cycleEndDate: updated.cycleEndDate,
    });

    res.status(201).json({
      message: "Cycle started",
      cycleStartDate: updated.cycleStartDate,
      cycleEndDate: updated.cycleEndDate,
    });
  } catch (err) {
    logger.error("START_CYCLE_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to start cycle" });
  }
};

// GET /api/cycle/shareout-preview — calculate without committing anything
exports.getShareoutPreview = async (req, res) => {
  try {
    const groupId = req.admin.groupId;
    if (!groupId) {
      return res
        .status(400)
        .json({ error: "No group associated with this account" });
    }

    const preview = await computeShareoutPreview(prisma, groupId);
    res.status(200).json(preview);
  } catch (err) {
    logger.error("SHAREOUT_PREVIEW_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to calculate share-out preview" });
  }
};

// POST /api/cycle/close — commit the share-out and close the cycle
exports.closeCycle = async (req, res) => {
  try {
    const groupId = req.admin.groupId;
    if (!groupId) {
      return res
        .status(400)
        .json({ error: "No group associated with this account" });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (!group.cycleActive) {
      return res.status(400).json({ error: "No active cycle to close" });
    }

    // Recalculate fresh at close time — never trust a preview the
    // chair may have viewed minutes or hours earlier.
    const preview = await computeShareoutPreview(prisma, groupId);

    await prisma.$transaction(async (tx) => {
      for (const m of preview.members) {
        await tx.payout.create({
          data: {
            groupId,
            memberId: m.memberId,
            cycleStartDate: group.cycleStartDate,
            cycleEndDate: group.cycleEndDate,
            entitledShare: m.entitledShare,
            loanOffset: m.loanOffset,
            cashPayout: m.cashPayout,
            remainingLoanBalance: m.remainingLoanBalance,
          },
        });

        await tx.member.update({
          where: { id: m.memberId },
          data: {
            balance: 0,
            totalSaved: 0,
            loanBalance: m.remainingLoanBalance,
          },
        });

        // Mark any loan whose interest was netted here as applied,
        // so it's never charged again if the balance carries forward.
        await tx.transaction.updateMany({
          where: {
            memberId: m.memberId,
            type: "borrow",
            status: "success",
            interestApplied: false,
          },
          data: { interestApplied: true },
        });
      }

      await tx.group.update({
        where: { id: groupId },
        data: {
          fundBalance: { decrement: preview.totalCashPayout },
          cycleActive: false,
          cycleStartDate: null,
          cycleEndDate: null,
        },
      });
    });

    logger.info("CYCLE_CLOSED", {
      groupId,
      closedBy: req.admin.username,
      totalCashPayout: preview.totalCashPayout,
      memberCount: preview.members.length,
    });

    res.status(200).json({
      message: "Cycle closed and share-out recorded",
      summary: preview,
    });
  } catch (err) {
    logger.error("CLOSE_CYCLE_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to close cycle" });
  }
};
