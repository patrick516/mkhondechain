// Alerts every superadmin by SMS. Used anywhere real money may
// be affected and a human needs to know immediately — never rely
// on someone reading log files to catch these.
// ─────────────────────────────────────────────────────────────

const prisma = require("./prismaClient");
const sendSms = require("./africasTalkingSms");
const logger = require("./logger");

async function alertSuperadmins(subject, details) {
  try {
    const superadmins = await prisma.admin.findMany({
      where: { role: "superadmin", phone: { not: null } },
      select: { phone: true },
    });

    const message = `MkhondeChain URGENT: ${subject}\n${details}`;

    for (const admin of superadmins) {
      try {
        await sendSms(admin.phone, message);
      } catch (smsErr) {
        logger.error("SUPERADMIN_ALERT_SMS_FAILED", {
          phone: admin.phone,
          error: smsErr.message,
        });
      }
    }
  } catch (err) {
    logger.error("SUPERADMIN_ALERT_LOOKUP_FAILED", { error: err.message });
  }
}

module.exports = alertSuperadmins;
