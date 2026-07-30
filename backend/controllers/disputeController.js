// Dispute Controller
// Members raise disputes via USSD (self-service); group leaders
// (or superadmin) investigate and resolve them from the dashboard.
// ─────────────────────────────────────────────────────────────

const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");

// Called from the USSD menu — member flags a problem with their
// account or a specific transaction.
exports.raiseDisputeViaUSSD = async (
  phoneNumber,
  description,
  transactionReference = null,
) => {
  const member = await prisma.member.findFirst({
    where: { phone: phoneNumber, status: "active" },
  });
  if (!member) throw new Error("Member not found or inactive");

  let transactionId = null;
  if (transactionReference) {
    const tx = await prisma.transaction.findUnique({
      where: { reference: transactionReference },
    });
    // Only link it if it's genuinely this member's own transaction —
    // never let a dispute attach to someone else's record.
    if (tx && tx.memberId === member.id) {
      transactionId = tx.id;
    }
  }

  const dispute = await prisma.dispute.create({
    data: {
      memberId: member.id,
      groupId: member.groupId,
      transactionId,
      source: "USSD",
      description: description.slice(0, 500),
    },
  });

  logger.info("DISPUTE_RAISED", {
    disputeId: dispute.id,
    memberId: member.id,
    groupId: member.groupId,
    transactionId,
  });

  return dispute;
};

// GET /api/disputes — group-scoped list (superadmin sees all)
exports.listDisputes = async (req, res) => {
  try {
    const where = {};
    if (req.admin.role !== "superadmin" && req.admin.groupId) {
      where.groupId = req.admin.groupId;
    }

    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        member: { select: { firstName: true, surname: true, phone: true } },
        transaction: {
          select: { reference: true, type: true, amount: true, status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(
      disputes.map((d) => ({
        id: d.id,
        member: `${d.member.firstName} ${d.member.surname}`,
        phone: d.member.phone,
        source: d.source,
        description: d.description,
        status: d.status,
        transactionReference: d.transaction?.reference || null,
        transactionType: d.transaction?.type || null,
        transactionAmount: d.transaction?.amount || null,
        createdAt: d.createdAt,
        resolvedAt: d.resolvedAt,
        resolutionNote: d.resolutionNote,
      })),
    );
  } catch (err) {
    logger.error("LIST_DISPUTES_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch disputes" });
  }
};

// PATCH /api/disputes/:disputeId/resolve
exports.resolveDispute = async (req, res) => {
  const { status, resolutionNote } = req.body;

  if (!["resolved", "rejected", "investigating"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.disputeId },
    });
    if (!dispute) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    // Group ownership check — a regular admin may only resolve
    // disputes belonging to their own group.
    if (
      req.admin.role !== "superadmin" &&
      dispute.groupId !== req.admin.groupId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const data = {
      status,
      resolutionNote: resolutionNote ? resolutionNote.slice(0, 500) : null,
    };
    if (status === "resolved" || status === "rejected") {
      data.resolvedById = req.admin.id;
      data.resolvedAt = new Date();
    }

    const updated = await prisma.dispute.update({
      where: { id: dispute.id },
      data,
    });

    logger.info("DISPUTE_RESOLVED", {
      disputeId: dispute.id,
      status,
      resolvedBy: req.admin.username,
    });

    res.status(200).json({ message: "Dispute updated", dispute: updated });
  } catch (err) {
    logger.error("RESOLVE_DISPUTE_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to update dispute" });
  }
};
