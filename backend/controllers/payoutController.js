// ─────────────────────────────────────────────────────────────
// File: backend/controllers/payoutController.js
// ─────────────────────────────────────────────────────────────
// Payout Controller
// Read-only history of every past share-out payout for a group.
// ─────────────────────────────────────────────────────────────

const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");
const PDFDocument = require("pdfkit");

// GET /api/payouts — full payout history for the caller's group
exports.getPayoutHistory = async (req, res) => {
  try {
    const groupId = req.admin.groupId;
    if (!groupId) {
      return res
        .status(400)
        .json({ error: "No group associated with this account" });
    }

    const payouts = await prisma.payout.findMany({
      where: { groupId },
      include: {
        member: { select: { firstName: true, surname: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(
      payouts.map((p) => ({
        id: p.id,
        firstName: p.member.firstName,
        surname: p.member.surname,
        phone: p.member.phone,
        cycleStartDate: p.cycleStartDate,
        cycleEndDate: p.cycleEndDate,
        entitledShare: p.entitledShare,
        loanOffset: p.loanOffset,
        cashPayout: p.cashPayout,
        remainingLoanBalance: p.remainingLoanBalance,
        note: p.note,
        createdAt: p.createdAt,
      })),
    );
  } catch (err) {
    logger.error("GET_PAYOUT_HISTORY_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch payout history" });
  }
};
// GET /api/payouts/export/pdf — download payout history as a PDF
exports.exportPayoutsPdf = async (req, res) => {
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

    const payouts = await prisma.payout.findMany({
      where: { groupId },
      include: {
        member: { select: { firstName: true, surname: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${group.name.replace(/\s+/g, "_")}_payout_history.pdf"`,
    );
    doc.pipe(res);

    // Header
    doc
      .fontSize(18)
      .text(`${group.name} — Payout History`, { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1.5);
    doc.fillColor("#000");

    if (payouts.length === 0) {
      doc.fontSize(12).text("No payouts recorded yet.");
    } else {
      // Table header
      const colX = {
        name: 40,
        cycle: 150,
        share: 280,
        offset: 350,
        payout: 420,
        carry: 490,
      };
      const rowHeight = 20;
      let y = doc.y;

      doc.fontSize(9).font("Helvetica-Bold");
      doc.text("Member", colX.name, y);
      doc.text("Cycle", colX.cycle, y);
      doc.text("Share", colX.share, y);
      doc.text("Offset", colX.offset, y);
      doc.text("Payout", colX.payout, y);
      doc.text("Carried Over", colX.carry, y);
      y += rowHeight;
      doc
        .moveTo(40, y - 5)
        .lineTo(555, y - 5)
        .stroke();

      doc.font("Helvetica").fontSize(8);

      for (const p of payouts) {
        if (y > 750) {
          doc.addPage();
          y = 40;
        }

        const cycleRange = `${new Date(p.cycleStartDate).toLocaleDateString()} - ${new Date(p.cycleEndDate).toLocaleDateString()}`;

        doc.text(`${p.member.firstName} ${p.member.surname}`, colX.name, y, {
          width: 105,
        });
        doc.text(cycleRange, colX.cycle, y, { width: 125 });
        doc.text(`MK ${p.entitledShare.toLocaleString()}`, colX.share, y, {
          width: 65,
        });
        doc.text(
          p.loanOffset > 0 ? `MK ${p.loanOffset.toLocaleString()}` : "-",
          colX.offset,
          y,
          { width: 65 },
        );
        doc.text(`MK ${p.cashPayout.toLocaleString()}`, colX.payout, y, {
          width: 65,
        });
        doc.text(
          p.remainingLoanBalance > 0
            ? `MK ${p.remainingLoanBalance.toLocaleString()}`
            : "-",
          colX.carry,
          y,
          { width: 65 },
        );

        y += rowHeight;
      }
    }

    doc.end();

    logger.info("PAYOUT_HISTORY_EXPORTED", {
      groupId,
      exportedBy: req.admin.username,
    });
  } catch (err) {
    logger.error("EXPORT_PAYOUTS_PDF_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to export payout history" });
  }
};
