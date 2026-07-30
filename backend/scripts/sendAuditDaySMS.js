// Send Audit Day SMS
// Notifies all active members to verify their records with group leader.
// Can be run manually or scheduled via cron.
// ─────────────────────────────────────────────────────────────

require("dotenv").config();

const prisma = require("../utils/prismaClient");
const sendSms = require("../utils/africasTalkingSms");
const logger = require("../utils/logger");

async function sendAuditDaySMS(groupId = null) {
  try {
    logger.info("AUDIT_SMS_SCRIPT_STARTED", { groupId: groupId || "all" });

    const message =
      `MkhondeChain: Lero ndilo tsiku la Audit!\n` +
      `Today is Audit Transparency Day.\n` +
      `Visit your group leader to verify your savings & loan record.`;

    // Build where clause
    const where = { status: "active", phone: { not: null } };

    if (groupId) {
      where.groupId = groupId;
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        throw new Error(`Group ${groupId} not found`);
      }
    }

    const members = await prisma.member.findMany({
      where,
      select: { phone: true, firstName: true, groupId: true },
    });

    if (members.length === 0) {
      console.log("No active members found.");
      process.exit(0);
    }

    let sent = 0;
    let failed = 0;

    for (const member of members) {
      try {
        // Rate limiting: max 10 SMS per second to avoid AT limits
        await new Promise((resolve) => setTimeout(resolve, 100));

        await sendSms(member.phone, message);
        sent++;
        process.stdout.write(
          `\rSent: ${sent} | Failed: ${failed} | Total: ${members.length}`,
        );
      } catch (err) {
        failed++;
        logger.error("AUDIT_SMS_FAILED", {
          phone: member.phone,
          error: err.message,
        });
      }
    }

    console.log(`\n\nAudit Day SMS complete.`);
    console.log(`  Sent: ${sent}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Total: ${members.length}`);

    logger.info("AUDIT_SMS_SCRIPT_COMPLETE", {
      sent,
      failed,
      total: members.length,
    });
  } catch (error) {
    logger.error("AUDIT_SMS_SCRIPT_ERROR", { error: error.message });
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// CLI usage: node sendAuditDaySMS.js [groupId]
const targetGroupId = process.argv[2] || null;
sendAuditDaySMS(targetGroupId);
