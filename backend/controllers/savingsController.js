// Savings Controller — MkhondeChain
// All financial state lives in PostgreSQL via Prisma.
// Mobile money is the disbursement/collection channel only.
//
// Every multi-table write runs inside prisma.$transaction() —
// real ACID guarantees: all changes commit together, or none do.
// ─────────────────────────────────────────────────────────────

const prisma = require("../utils/prismaClient");
const sendSms = require("../utils/africasTalkingSms");
const {
  initiateMobileCheckout,
  sendMobileMoney,
} = require("../utils/paymentGateway");
const { calculateAccruedInterest } = require("../utils/loanInterest");
const logger = require("../utils/logger");
const alertSuperadmins = require("../utils/alertSuperadmins");

const generateReference = (type) => {
  const prefixMap = {
    save: "SAV",
    borrow: "BOR",
    repay: "REP",
    interest: "INT",
    fee: "FEE",
  };
  const prefix = prefixMap[type] || "TXN";
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${timestamp}-${random}`;
};

function calculateDueDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return Math.floor(date.getTime() / 1000); // Unix timestamp
}

// ─────────────────────────────────────────────────────────────
// USSD METHODS
// ─────────────────────────────────────────────────────────────

/**
 * Save money via USSD
 * Flow: Member sends mobile money → System records → Confirms
 */
exports.depositViaUSSD = async (phoneNumber, amount, req) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  const member = await prisma.member.findFirst({
    where: { phone: phoneNumber, status: "active" },
  });
  if (!member) throw new Error("Member not found or inactive");

  const group = await prisma.group.findUnique({
    where: { id: member.groupId },
  });
  if (!group || group.status !== "active") {
    throw new Error("Group not found or inactive");
  }

  const reference = generateReference("save");

  // Step 1: Initiate mobile money checkout (member pays IN)
  let mmRef;
  try {
    const checkout = await initiateMobileCheckout(
      phoneNumber,
      amount,
      reference,
    );
    mmRef = checkout.reference;
  } catch (err) {
    logger.security.ussdFailed(
      phoneNumber,
      "save",
      amount,
      clientIp,
      "Mobile money checkout failed",
    );
    throw new Error("Mobile money checkout failed. Please try again.");
  }

  // Step 2: Record transaction atomically — member balance, group fund,
  // and the transaction record all commit together or not at all.
  let updatedMember;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Idempotency guard: never double-record the same reference
      const existing = await tx.transaction.findUnique({
        where: { reference },
      });
      if (existing) {
        throw new Error("DUPLICATE_REFERENCE");
      }

      const beforeBalance = member.balance;
      const afterBalance = beforeBalance + amount;

      const newMember = await tx.member.update({
        where: { id: member.id },
        data: {
          balance: afterBalance,
          totalSaved: { increment: amount },
          savingsCount: { increment: 1 },
          lastActivity: new Date(),
        },
      });

      await tx.group.update({
        where: { id: group.id },
        data: { fundBalance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          reference,
          memberId: member.id,
          groupId: group.id,
          type: "save",
          amount,
          beforeBalance,
          afterBalance,
          beforeLoanBalance: member.loanBalance,
          afterLoanBalance: member.loanBalance,
          status: "success",
          method: "USSD",
          mobileMoneyRef: mmRef,
          ipAddress: clientIp,
        },
      });

      return newMember;
    });

    updatedMember = result;
  } catch (err) {
    // CRITICAL: mobile money already moved, but the DB write failed.
    // This must never be silent — it's real money with no ledger entry
    // until someone manually reconciles it using this exact log line.
    logger.error("SAVE_DB_TRANSACTION_FAILED_AFTER_PAYMENT", {
      phoneNumber,
      amount,
      reference,
      mobileMoneyRef: mmRef,
      error: err.message,
    });
    logger.security.ussdFailed(
      phoneNumber,
      "save",
      amount,
      clientIp,
      `DB error: ${err.message}`,
    );
    await alertSuperadmins(
      "Save payment succeeded but ledger write failed",
      `Phone: ${phoneNumber}\nAmount: MK${amount.toLocaleString()}\nReference: ${reference}\nMobileMoneyRef: ${mmRef}`,
    );
    throw new Error(
      "Transaction could not be completed. Please contact your group leader with reference " +
        reference,
    );
  }

  // Step 3: SMS confirmation — failure here must never mask the fact
  // that the financial transaction already succeeded.
  try {
    await sendSms(
      phoneNumber,
      `MkhondeChain: Zachita bwino! MK${amount.toLocaleString()} yasungidwa.\n` +
        `Success! MK${amount.toLocaleString()} saved. Balance: MK${updatedMember.balance.toLocaleString()}. Zikomo!`,
    );
  } catch (smsErr) {
    logger.error("SMS_SEND_FAILED", {
      phoneNumber,
      context: "deposit",
      error: smsErr.message,
    });
  }

  // Step 4: Live dashboard update
  const io = req.app.get("io");
  if (io) {
    io.emit("transaction:new", {
      member: `${member.firstName} ${member.surname}`,
      type: "Saved",
      amount: `MK ${amount.toLocaleString()}`,
      reference,
      date: new Date().toISOString(),
    });
  }

  logger.security.ussdTransaction(
    phoneNumber,
    "save",
    amount,
    clientIp,
    reference,
  );

  return { success: true, reference, balance: updatedMember.balance };
};

// ─────────────────────────────────────────────────────────────

/**
 * Request a loan via USSD
 * Requires: group leader approval before disbursement
 */
exports.requestLoan = async (phoneNumber, amount, req) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  const member = await prisma.member.findFirst({
    where: { phone: phoneNumber, status: "active" },
  });
  if (!member) throw new Error("Member not found or inactive");

  const group = await prisma.group.findUnique({
    where: { id: member.groupId },
  });
  if (!group || group.status !== "active") {
    throw new Error("Group not found or inactive");
  }

  // Check eligibility
  const eligible = await exports.canBorrow(phoneNumber, amount);
  if (!eligible) {
    throw new Error("Not eligible to borrow this amount");
  }

  // Check group has enough funds
  if (group.fundBalance < amount) {
    throw new Error("Group fund insufficient for this loan");
  }

  const reference = generateReference("borrow");

  // Create pending loan transaction (NOT disbursed yet) — atomic
  let updatedMember;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({
        where: { reference },
      });
      if (existing) {
        throw new Error("DUPLICATE_REFERENCE");
      }

      const beforeBalance = member.balance;
      const beforeLoan = member.loanBalance;
      const afterLoan = beforeLoan + amount;

      const newMember = await tx.member.update({
        where: { id: member.id },
        data: {
          loanBalance: afterLoan,
          totalBorrowed: { increment: amount },
          borrowCount: { increment: 1 },
          lastActivity: new Date(),
        },
      });

      await tx.group.update({
        where: { id: group.id },
        data: { fundBalance: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          reference,
          memberId: member.id,
          groupId: group.id,
          type: "borrow",
          amount,
          beforeBalance,
          afterBalance: beforeBalance,
          beforeLoanBalance: beforeLoan,
          afterLoanBalance: afterLoan,
          status: "pending", // PENDING — needs group leader approval
          method: "USSD",
          ipAddress: clientIp,
        },
      });

      return newMember;
    });

    updatedMember = result;
  } catch (err) {
    logger.error("LOAN_REQUEST_DB_ERROR", {
      phoneNumber,
      amount,
      reference,
      error: err.message,
    });
    throw new Error("Loan request failed. Please try again.");
  }

  // Notify group leader for approval
  const leader = await prisma.admin.findUnique({
    where: { id: group.leaderId },
  });
  if (leader && leader.phone) {
    try {
      await sendSms(
        leader.phone,
        `MkhondeChain: ${member.firstName} ${member.surname} requested MK${amount.toLocaleString()} loan.\n` +
          `Dial *XXX# → Admin → Approve Loans to review.`,
      );
    } catch (smsErr) {
      logger.error("SMS_SEND_FAILED", {
        phone: leader.phone,
        context: "loan_request_leader",
        error: smsErr.message,
      });
    }
  }

  // Notify member
  try {
    await sendSms(
      phoneNumber,
      `MkhondeChain: Ngongole yanu yafunsidwa. MK${amount.toLocaleString()}\n` +
        `Loan request submitted. Waiting for group leader approval.`,
    );
  } catch (smsErr) {
    logger.error("SMS_SEND_FAILED", {
      phoneNumber,
      context: "loan_request_member",
      error: smsErr.message,
    });
  }

  logger.security.ussdTransaction(
    phoneNumber,
    "borrow_request",
    amount,
    clientIp,
    reference,
  );

  return { success: true, reference, status: "pending_approval" };
};

// Approve and disburse a loan (called by group leader via dashboard)

exports.approveAndDisburseLoan = async (transactionId, admin) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction || transaction.type !== "borrow") {
    throw new Error("Invalid loan transaction");
  }
  if (transaction.status !== "pending") {
    throw new Error("Loan already processed");
  }

  // Group ownership check — a regular admin may only approve loans
  // belonging to their own group, never another group's.
  if (admin.role !== "superadmin" && transaction.groupId !== admin.groupId) {
    throw new Error("ACCESS_DENIED");
  }

  const member = await prisma.member.findUnique({
    where: { id: transaction.memberId },
  });
  const group = await prisma.group.findUnique({
    where: { id: transaction.groupId },
  });

  // Disburse via mobile money — done OUTSIDE the DB transaction, since
  // it's an external call that can't be rolled back by Postgres.
  let mmRef;
  try {
    const disbursement = await sendMobileMoney(
      member.phone,
      transaction.amount,
      transaction.reference,
    );
    mmRef = disbursement.reference;
  } catch (err) {
    // Disbursement failed — reverse the hold atomically
    await prisma.$transaction(async (tx) => {
      await tx.group.update({
        where: { id: group.id },
        data: { fundBalance: { increment: transaction.amount } },
      });
      await tx.member.update({
        where: { id: member.id },
        data: { loanBalance: { decrement: transaction.amount } },
      });
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "failed",
          note: `Disbursement failed: ${err.message}`,
        },
      });
    });

    logger.error("LOAN_DISBURSEMENT_FAILED", {
      transactionId,
      reference: transaction.reference,
      error: err.message,
    });

    throw new Error("Loan disbursement failed. Funds returned to group.");
  }

  // Interest is no longer charged upfront — it's calculated later,
  // at the member's first repayment attempt, based on how many
  // days the loan was actually held (see loanInterest.js). This
  // is the fair, prorated behavior: pay back quickly, owe less.
  const disbursedAt = new Date();
  const dueDate = new Date(
    disbursedAt.getTime() + group.maxRepayDays * 24 * 60 * 60 * 1000,
  );

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: "success",
      approvedById: admin.id,
      mobileMoneyRef: mmRef,
      disbursedAt,
      dueDate,
    },
  });

  // Notify member
  try {
    await sendSms(
      member.phone,
      `MkhondeChain: Ngongole yapita! MK${transaction.amount.toLocaleString()} yapita ku wallet yanu.\n` +
        `Muyenera kubweza pofika ${dueDate.toDateString()}. Chiwongola dzanja chidzawerengedwa pa nthawi yobweza, kutengera masiku amene mwakhala nawo ngongole.\n` +
        `Loan approved! MK${transaction.amount.toLocaleString()} sent. Repay by ${dueDate.toDateString()}. Interest will be calculated when you repay, based on days held.`,
    );
  } catch (smsErr) {
    logger.error("SMS_SEND_FAILED", {
      phone: member.phone,
      context: "loan_approved",
      error: smsErr.message,
    });
  }

  // Audit log
  await prisma.audit.create({
    data: {
      action: "LoanDisbursed",
      performedById: admin.id,
      targetMemberId: member.id,
      targetMemberPhone: member.phone,
      groupId: group.id,
      details: { amount: transaction.amount, reference: transaction.reference },
    },
  });

  return { success: true, reference: transaction.reference };
};

// ─────────────────────────────────────────────────────────────

/**
 * Repay loan via USSD
 */
exports.repayLoanViaUSSD = async (phoneNumber, amount, req) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  const member = await prisma.member.findFirst({
    where: { phone: phoneNumber, status: "active" },
  });
  if (!member) throw new Error("Member not found or inactive");

  if (member.loanBalance === 0) {
    throw new Error("No active loan to repay");
  }

  const group = await prisma.group.findUnique({
    where: { id: member.groupId },
  });

  // Find the active loan disbursement this balance belongs to, so we
  // know how long it's actually been held.
  const activeLoan = await prisma.transaction.findFirst({
    where: { memberId: member.id, type: "borrow", status: "success" },
    orderBy: { createdAt: "desc" },
  });

  let interestToApply = 0;
  if (activeLoan && !activeLoan.interestApplied && activeLoan.disbursedAt) {
    interestToApply = calculateAccruedInterest(
      activeLoan.amount,
      group,
      activeLoan.disbursedAt,
    );
  }

  // The real amount owed right now = principal remaining + any
  // not-yet-applied prorated interest.
  const totalOwed = member.loanBalance + interestToApply;

  if (amount > totalOwed) {
    throw new Error(
      `Repayment exceeds amount owed. You owe MK${totalOwed.toLocaleString()} (including interest)`,
    );
  }

  const reference = generateReference("repay");

  // Step 1: Initiate mobile money checkout (member pays IN)
  let mmRef;
  try {
    const checkout = await initiateMobileCheckout(
      phoneNumber,
      amount,
      reference,
    );
    mmRef = checkout.reference;
  } catch (err) {
    throw new Error("Mobile money checkout failed. Please try again.");
  }

  // Step 2: Record repayment atomically. If this is the first
  // repayment on this loan, also apply the prorated interest now.
  let updatedMember;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({
        where: { reference },
      });
      if (existing) {
        throw new Error("DUPLICATE_REFERENCE");
      }

      const beforeBalance = member.balance;
      let beforeLoan = member.loanBalance;

      // Apply interest first, if not already applied for this loan
      if (interestToApply > 0 && activeLoan) {
        const loanBalanceWithInterest = beforeLoan + interestToApply;

        await tx.member.update({
          where: { id: member.id },
          data: {
            loanBalance: loanBalanceWithInterest,
            activeLoanInterestTotal: interestToApply,
            activeLoanInterestCollected: 0,
          },
        });
        await tx.transaction.create({
          data: {
            reference: generateReference("interest"),
            memberId: member.id,
            groupId: group.id,
            type: "interest",
            amount: interestToApply,
            beforeBalance: member.balance,
            afterBalance: member.balance,
            beforeLoanBalance: beforeLoan,
            afterLoanBalance: loanBalanceWithInterest,
            status: "success",
            method: "System",
            note: `Prorated interest on loan ${activeLoan.reference}, applied at first repayment`,
          },
        });

        await tx.transaction.update({
          where: { id: activeLoan.id },
          data: { interestApplied: true },
        });

        beforeLoan = loanBalanceWithInterest;
      }

      // Split this repayment into interest vs principal — interest
      // is paid off first, standard loan convention. This is what
      // lets us take our 2% only from real interest actually repaid,
      // never from principal.
      const interestOwed = Math.max(
        0,
        member.activeLoanInterestTotal - member.activeLoanInterestCollected,
      );
      const interestPortion = Math.min(amount, interestOwed);
      const platformFee =
        Math.round(interestPortion * (group.platformFeePercent / 100) * 100) /
        100;
      const netToGroupFund = amount - platformFee;

      const afterLoan = beforeLoan - amount;

      const newMember = await tx.member.update({
        where: { id: member.id },
        data: {
          loanBalance: afterLoan,
          totalRepaid: { increment: amount },
          activeLoanInterestCollected: { increment: interestPortion },
          lastActivity: new Date(),
          // Loan fully cleared — reset interest tracking for next loan
          ...(afterLoan <= 0
            ? { activeLoanInterestTotal: 0, activeLoanInterestCollected: 0 }
            : {}),
        },
      });

      await tx.group.update({
        where: { id: group.id },
        data: { fundBalance: { increment: netToGroupFund } },
      });

      await tx.transaction.create({
        data: {
          reference,
          memberId: member.id,
          groupId: group.id,
          type: "repay",
          amount,
          beforeBalance,
          afterBalance: beforeBalance,
          beforeLoanBalance: beforeLoan,
          afterLoanBalance: afterLoan,
          status: "success",
          method: "USSD",
          mobileMoneyRef: mmRef,
          ipAddress: clientIp,
        },
      });

      // Record the platform fee as its own immutable transaction —
      // only created when there actually was interest in this
      // repayment to take a share from.
      if (platformFee > 0) {
        await tx.transaction.create({
          data: {
            reference: generateReference("fee"),
            memberId: member.id,
            groupId: group.id,
            type: "fee",
            amount: platformFee,
            beforeBalance,
            afterBalance: beforeBalance,
            beforeLoanBalance: beforeLoan,
            afterLoanBalance: afterLoan,
            status: "success",
            method: "System",
            note: `Platform fee: ${group.platformFeePercent}% of MK${interestPortion.toLocaleString()} interest collected (ref ${reference})`,
          },
        });

        await tx.systemConfig.upsert({
          where: { id: "singleton" },
          update: { totalPlatformFeesCollected: { increment: platformFee } },
          create: { id: "singleton", totalPlatformFeesCollected: platformFee },
        });
      }

      return newMember;
    });

    updatedMember = result;
  } catch (err) {
    logger.error("REPAY_DB_TRANSACTION_FAILED_AFTER_PAYMENT", {
      phoneNumber,
      amount,
      reference,
      mobileMoneyRef: mmRef,
      error: err.message,
    });
    await alertSuperadmins(
      "Repayment succeeded but ledger write failed",
      `Phone: ${phoneNumber}\nAmount: MK${amount.toLocaleString()}\nReference: ${reference}\nMobileMoneyRef: ${mmRef}`,
    );
    throw new Error(
      "Repayment could not be completed. Please contact your group leader with reference " +
        reference,
    );
  }

  // Confirm SMS
  try {
    await sendSms(
      phoneNumber,
      `MkhondeChain: Zachita bwino! MK${amount.toLocaleString()} yabwezedwa.\n` +
        `Repaid MK${amount.toLocaleString()}. Loan balance: MK${updatedMember.loanBalance.toLocaleString()}. Zikomo!`,
    );
  } catch (smsErr) {
    logger.error("SMS_SEND_FAILED", {
      phoneNumber,
      context: "repay",
      error: smsErr.message,
    });
  }

  logger.security.ussdTransaction(
    phoneNumber,
    "repay",
    amount,
    clientIp,
    reference,
  );

  return { success: true, reference, loanBalance: updatedMember.loanBalance };
};

// ─────────────────────────────────────────────────────────────

/**
 * Check if member is eligible to borrow
 */
exports.canBorrow = async (phoneNumber, amount) => {
  const member = await prisma.member.findFirst({
    where: { phone: phoneNumber, status: "active" },
  });
  if (!member) return false;

  const group = await prisma.group.findUnique({
    where: { id: member.groupId },
  });
  if (!group) return false;

  // Cannot borrow if already has loan
  if (member.loanBalance > 0) return false;

  // Max loan = percentage of savings
  const maxLoan = Math.floor(member.balance * (group.maxLoanPercent / 100));
  return amount <= maxLoan && amount <= group.fundBalance;
};

/**
 * Get balance for USSD display
 */
exports.getBalanceForUSSD = async (phoneNumber) => {
  const member = await prisma.member.findFirst({
    where: { phone: phoneNumber, status: "active" },
  });
  if (!member) throw new Error("Member not found");

  const group = await prisma.group.findUnique({
    where: { id: member.groupId },
  });
  const maxLoan = Math.floor(
    member.balance * ((group?.maxLoanPercent || 50) / 100),
  );

  let loanDueDate = 0;
  let owedIfPaidToday = member.loanBalance;

  if (member.loanBalance > 0) {
    const activeLoan = await prisma.transaction.findFirst({
      where: { memberId: member.id, type: "borrow", status: "success" },
      orderBy: { createdAt: "desc" },
    });
    loanDueDate = activeLoan?.dueDate
      ? Math.floor(activeLoan.dueDate.getTime() / 1000)
      : calculateDueDate(group?.maxRepayDays || 30);

    // Show a live "what you'd owe if you paid today" estimate,
    // including interest not yet officially applied.
    if (activeLoan && !activeLoan.interestApplied && activeLoan.disbursedAt) {
      const estimatedInterest = calculateAccruedInterest(
        activeLoan.amount,
        group,
        activeLoan.disbursedAt,
      );
      owedIfPaidToday = member.loanBalance + estimatedInterest;
    }
  }

  return {
    totalSaved: member.totalSaved,
    balance: member.balance,
    loanAmount: member.loanBalance,
    owedIfPaidToday,
    loanDueDate,
    eligibleToBorrow: maxLoan,
  };
};
// ─────────────────────────────────────────────────────────────
// WEB API METHODS (Admin Dashboard)
// ─────────────────────────────────────────────────────────────

exports.getBalanceForAPI = async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.memberId },
    });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const group = await prisma.group.findUnique({
      where: { id: member.groupId },
    });

    res.status(200).json({
      balance: member.balance,
      totalSaved: member.totalSaved,
      loanBalance: member.loanBalance,
      totalBorrowed: member.totalBorrowed,
      totalRepaid: member.totalRepaid,
      eligibleToBorrow: Math.floor(
        member.balance * ((group?.maxLoanPercent || 50) / 100),
      ),
      maxRepayDays: group?.maxRepayDays || 30,
    });
  } catch (err) {
    logger.error("BALANCE_API_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to get balance" });
  }
};

exports.rejectLoan = async (req, res) => {
  const { transactionId, reason } = req.body;
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!transaction || transaction.type !== "borrow") {
      return res.status(404).json({ error: "Loan request not found" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "Loan already processed" });
    }

    // Group ownership check — a regular admin may only reject loans
    // belonging to their own group, never another group's.
    if (
      req.admin.role !== "superadmin" &&
      transaction.groupId !== req.admin.groupId
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Reverse the hold atomically
    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: transaction.memberId },
        data: { loanBalance: { decrement: transaction.amount } },
      });
      await tx.group.update({
        where: { id: transaction.groupId },
        data: { fundBalance: { increment: transaction.amount } },
      });
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "failed",
          note: `Rejected: ${reason}`,
          approvedById: req.admin.id,
        },
      });
    });

    const member = await prisma.member.findUnique({
      where: { id: transaction.memberId },
    });

    try {
      await sendSms(
        member.phone,
        `MkhondeChain: Ngongole yakana. Chifukwa: ${reason}\n` +
          `Loan rejected. Reason: ${reason}`,
      );
    } catch (smsErr) {
      logger.error("SMS_SEND_FAILED", {
        phone: member.phone,
        context: "loan_rejected",
        error: smsErr.message,
      });
    }

    res
      .status(200)
      .json({ message: "Loan rejected", reference: transaction.reference });
  } catch (err) {
    logger.error("REJECT_LOAN_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to reject loan" });
  }
};
