// Scheduled jobs:
//   1. Nightly vault reconciliation — compares the ledger's
//      total savings against a manually-entered known balance,
//      and alerts every superadmin by SMS if they don't match.
//   2. Daily overdue-loan check — reminds any member whose loan
//      has passed its due date and is still outstanding. Sends
//      exactly one reminder per loan (see overdueReminderSent).
// ─────────────────────────────────────────────────────────────

const cron = require("node-cron");
const prisma = require("../utils/prismaClient");
const sendSms = require("../utils/africasTalkingSms");
const alertSuperadmins = require("../utils/alertSuperadmins");
const logger = require("../utils/logger");

async function runVaultReconciliation() {
  try {
    const memberSums = await prisma.member.aggregate({
      _sum: { balance: true },
    });
    const ledgerTotal = memberSums._sum.balance || 0;

    // BEFORE (manual, today)
    const config = await prisma.systemConfig.findUnique({
      where: { id: "singleton" },
    });
    const knownBalance = config?.knownMobileMoneyBalance ?? 0;

    // AFTER (live API, once real integration exists)
    // const knownBalance = await airtelMoneyAPI.getAccountBalance();

    const difference = Math.round((ledgerTotal - knownBalance) * 100) / 100;

    logger.info("VAULT_RECONCILIATION_CHECK", {
      ledgerTotal,
      knownBalance,
      difference,
    });

    if (difference !== 0) {
      await alertSuperadmins(
        "Vault mismatch detected",
        `Ledger total: MK${ledgerTotal.toLocaleString()}\n` +
          `Known balance: MK${knownBalance.toLocaleString()}\n` +
          `Difference: MK${difference.toLocaleString()}\n` +
          `Check immediately.`,
      );
      logger.error("VAULT_RECONCILIATION_MISMATCH", {
        ledgerTotal,
        knownBalance,
        difference,
      });
    }
  } catch (err) {
    logger.error("VAULT_RECONCILIATION_JOB_ERROR", { error: err.message });
  }
}

async function checkOverdueLoans() {
  try {
    const now = new Date();
    const overdueLoans = await prisma.transaction.findMany({
      where: {
        type: "borrow",
        status: "success",
        dueDate: { lt: now },
        overdueReminderSent: false,
      },
      include: { member: true },
    });

    for (const loan of overdueLoans) {
      // The transaction can stay "success" forever even after full
      // repayment — only remind if the member genuinely still owes.
      if (!loan.member || loan.member.loanBalance <= 0) continue;

      try {
        await sendSms(
          loan.member.phone,
          `MkhondeChain: Ngongole yanu MK${loan.amount.toLocaleString()} yapitilira tsiku lobweza.\n` +
            `Your loan of MK${loan.amount.toLocaleString()} is now overdue. Please repay as soon as possible.`,
        );
      } catch (smsErr) {
        logger.error("OVERDUE_REMINDER_SMS_FAILED", {
          memberId: loan.memberId,
          error: smsErr.message,
        });
      }

      await prisma.transaction.update({
        where: { id: loan.id },
        data: { overdueReminderSent: true },
      });

      logger.info("OVERDUE_LOAN_REMINDER_SENT", {
        memberId: loan.memberId,
        groupId: loan.groupId,
        reference: loan.reference,
        dueDate: loan.dueDate,
      });
    }
  } catch (err) {
    logger.error("OVERDUE_LOAN_CHECK_ERROR", { error: err.message });
  }
}

// Reconciliation: every day at 02:00 server time
cron.schedule("0 2 * * *", runVaultReconciliation);

// Overdue loans: every day at 07:00 server time (separate hour,
// separate concern, spreads the load)
cron.schedule("0 7 * * *", checkOverdueLoans);

module.exports = { runVaultReconciliation, checkOverdueLoans };
