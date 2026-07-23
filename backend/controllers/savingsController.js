// ─────────────────────────────────────────────────────────────
// Savings Controller — MkhondeChain (Non-Blockchain)
// All financial state lives in MongoDB.
// Mobile money is the disbursement channel only.
// ─────────────────────────────────────────────────────────────

const Member = require("../models/memberModel");
const Group = require("../models/Group");
const Transaction = require("../models/transactionModel");
const Audit = require("../models/auditModel");
const sendSms = require("../utils/africasTalkingSms");
const {
  initiateMobileCheckout,
  sendMobileMoney,
} = require("../utils/paymentGateway");
const logger = require("../utils/logger");

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const generateReference = (type) => {
  const prefix = type === "save" ? "SAV" : type === "borrow" ? "BOR" : "REP";
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${timestamp}-${random}`;
};

// ─────────────────────────────────────────────────────────────
// USSD METHODS
// ─────────────────────────────────────────────────────────────

/**
 * Save money via USSD
 * Flow: Member sends mobile money → System records → Confirms
 */
exports.depositViaUSSD = async (phoneNumber, amount, req) => {
  const member = await Member.findOne({ phone: phoneNumber, status: "active" });
  if (!member) throw new Error("Member not found or inactive");

  const group = await Group.findById(member.groupId);
  if (!group || group.status !== "active") {
    throw new Error("Group not found or inactive");
  }

  const reference = generateReference("save");
  const clientIp = req.ip || req.connection.remoteAddress;

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

  // Step 2: Record transaction (atomic with member update)
  const session = await Member.startSession();
  let transaction;

  try {
    await session.withTransaction(async () => {
      const beforeBalance = member.balance;
      member.balance += amount;
      member.totalSaved += amount;
      member.savingsCount += 1;
      member.lastActivity = new Date();
      await member.save({ session });

      group.fundBalance += amount;
      await group.save({ session });

      transaction = await Transaction.create(
        [
          {
            reference,
            member: member._id,
            groupId: group._id,
            type: "save",
            amount,
            beforeBalance,
            afterBalance: member.balance,
            beforeLoanBalance: member.loanBalance,
            afterLoanBalance: member.loanBalance,
            status: "success",
            method: "USSD",
            mobileMoneyRef: mmRef,
            ipAddress: clientIp,
          },
        ],
        { session },
      );
    });

    await session.endSession();
  } catch (err) {
    await session.endSession();
    logger.security.ussdFailed(
      phoneNumber,
      "save",
      amount,
      clientIp,
      `DB error: ${err.message}`,
    );
    throw new Error("Transaction failed. Please try again.");
  }

  // Step 3: SMS confirmation
  await sendSms(
    phoneNumber,
    `MkhondeChain: Zachita bwino! MK${amount.toLocaleString()} yasungidwa.\n` +
      `Success! MK${amount.toLocaleString()} saved. Balance: MK${member.balance.toLocaleString()}. Zikomo!`,
  );

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

  return { success: true, reference, balance: member.balance };
};

// ─────────────────────────────────────────────────────────────

/**
 * Request a loan via USSD
 * Requires: group leader approval before disbursement
 */
exports.requestLoan = async (phoneNumber, amount, req) => {
  const member = await Member.findOne({ phone: phoneNumber, status: "active" });
  if (!member) throw new Error("Member not found or inactive");

  const group = await Group.findById(member.groupId);
  if (!group || group.status !== "active") {
    throw new Error("Group not found or inactive");
  }

  // Check eligibility
  const canBorrow = await exports.canBorrow(phoneNumber, amount);
  if (!canBorrow) {
    throw new Error("Not eligible to borrow this amount");
  }

  // Check group has enough funds
  if (group.fundBalance < amount) {
    throw new Error("Group fund insufficient for this loan");
  }

  const reference = generateReference("borrow");
  const clientIp = req.ip || req.connection.remoteAddress;

  // Create pending loan transaction (NOT disbursed yet)
  const session = await Member.startSession();
  let transaction;

  try {
    await session.withTransaction(async () => {
      const beforeBalance = member.balance;
      const beforeLoan = member.loanBalance;

      member.loanBalance += amount;
      member.totalBorrowed += amount;
      member.borrowCount += 1;
      member.lastActivity = new Date();
      await member.save({ session });

      group.fundBalance -= amount;
      await group.save({ session });

      transaction = await Transaction.create(
        [
          {
            reference,
            member: member._id,
            groupId: group._id,
            type: "borrow",
            amount,
            beforeBalance,
            afterBalance: member.balance,
            beforeLoanBalance: beforeLoan,
            afterLoanBalance: member.loanBalance,
            status: "pending", // PENDING — needs group leader approval
            method: "USSD",
            ipAddress: clientIp,
          },
        ],
        { session },
      );
    });

    await session.endSession();
  } catch (err) {
    await session.endSession();
    throw new Error("Loan request failed. Please try again.");
  }

  // Notify group leader for approval
  const leader = await require("../models/Admin").findById(group.leader);
  if (leader && leader.phone) {
    await sendSms(
      leader.phone,
      `MkhondeChain: ${member.firstName} ${member.surname} requested MK${amount.toLocaleString()} loan.\n` +
        `Dial *XXX# → Admin → Approve Loans to review.`,
    );
  }

  // Notify member
  await sendSms(
    phoneNumber,
    `MkhondeChain: Ngongole yanu yafunsidwa. MK${amount.toLocaleString()}\n` +
      `Loan request submitted. Waiting for group leader approval.`,
  );

  logger.security.ussdTransaction(
    phoneNumber,
    "borrow_request",
    amount,
    clientIp,
    reference,
  );

  return { success: true, reference, status: "pending_approval" };
};

// ─────────────────────────────────────────────────────────────

/**
 * Approve and disburse a loan (called by group leader via dashboard)
 */
exports.approveAndDisburseLoan = async (transactionId, adminId) => {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction || transaction.type !== "borrow") {
    throw new Error("Invalid loan transaction");
  }
  if (transaction.status !== "pending") {
    throw new Error("Loan already processed");
  }

  const member = await Member.findById(transaction.member);
  const group = await Group.findById(transaction.groupId);

  // Disburse via mobile money
  let mmRef;
  try {
    const disbursement = await sendMobileMoney(
      member.phone,
      transaction.amount,
      transaction.reference,
    );
    mmRef = disbursement.reference;
  } catch (err) {
    // Reverse the hold on group funds
    group.fundBalance += transaction.amount;
    member.loanBalance -= transaction.amount;
    await group.save();
    await member.save();

    transaction.status = "failed";
    transaction.note = `Disbursement failed: ${err.message}`;
    await transaction.save();

    throw new Error("Loan disbursement failed. Funds returned to group.");
  }

  // Update transaction to success
  transaction.status = "success";
  transaction.approvedBy = adminId;
  transaction.mobileMoneyRef = mmRef;
  await transaction.save();

  // Notify member
  await sendSms(
    member.phone,
    `MkhondeChain: Ngongole yapita! MK${transaction.amount.toLocaleString()} yapita ku wallet yanu.\n` +
      `Loan approved! MK${transaction.amount.toLocaleString()} sent. Repay in ${group.maxRepayDays} days.`,
  );

  // Audit log
  await Audit.create({
    action: "LoanApproved",
    performedBy: adminId,
    targetMember: member.phone,
    details: { amount: transaction.amount, reference: transaction.reference },
  });

  return { success: true, reference: transaction.reference };
};

// ─────────────────────────────────────────────────────────────

/**
 * Repay loan via USSD
 */
exports.repayLoanViaUSSD = async (phoneNumber, amount, req) => {
  const member = await Member.findOne({ phone: phoneNumber, status: "active" });
  if (!member) throw new Error("Member not found or inactive");

  if (member.loanBalance === 0) {
    throw new Error("No active loan to repay");
  }

  if (amount > member.loanBalance) {
    throw new Error(
      `Repayment exceeds loan balance. You owe MK${member.loanBalance.toLocaleString()}`,
    );
  }

  const group = await Group.findById(member.groupId);
  const reference = generateReference("repay");
  const clientIp = req.ip || req.connection.remoteAddress;

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

  // Step 2: Record repayment
  const session = await Member.startSession();
  try {
    await session.withTransaction(async () => {
      const beforeBalance = member.balance;
      const beforeLoan = member.loanBalance;

      member.loanBalance -= amount;
      member.totalRepaid += amount;
      member.lastActivity = new Date();
      await member.save({ session });

      group.fundBalance += amount;
      await group.save({ session });

      await Transaction.create(
        [
          {
            reference,
            member: member._id,
            groupId: group._id,
            type: "repay",
            amount,
            beforeBalance,
            afterBalance: member.balance,
            beforeLoanBalance: beforeLoan,
            afterLoanBalance: member.loanBalance,
            status: "success",
            method: "USSD",
            mobileMoneyRef: mmRef,
            ipAddress: clientIp,
          },
        ],
        { session },
      );
    });

    await session.endSession();
  } catch (err) {
    await session.endSession();
    throw new Error("Repayment failed. Please try again.");
  }

  // Confirm SMS
  await sendSms(
    phoneNumber,
    `MkhondeChain: Zachita bwino! MK${amount.toLocaleString()} yabwezedwa.\n` +
      `Repaid MK${amount.toLocaleString()}. Loan balance: MK${member.loanBalance.toLocaleString()}. Zikomo!`,
  );

  logger.security.ussdTransaction(
    phoneNumber,
    "repay",
    amount,
    clientIp,
    reference,
  );

  return { success: true, reference, loanBalance: member.loanBalance };
};

// ─────────────────────────────────────────────────────────────

/**
 * Check if member is eligible to borrow
 */
exports.canBorrow = async (phoneNumber, amount) => {
  const member = await Member.findOne({ phone: phoneNumber, status: "active" });
  if (!member) return false;

  const group = await Group.findById(member.groupId);
  if (!group) return false;

  // Cannot borrow if already has loan
  if (member.loanBalance > 0) return false;

  // Max loan = percentage of savings
  const maxLoan = Math.floor(member.balance * (group.maxLoanPercent / 100));
  return amount <= maxLoan && amount <= group.fundBalance;
};

// ─────────────────────────────────────────────────────────────

/**
 * Get balance for USSD display
 */
exports.getBalanceForUSSD = async (phoneNumber) => {
  const member = await Member.findOne({ phone: phoneNumber, status: "active" });
  if (!member) throw new Error("Member not found");

  const group = await Group.findById(member.groupId);
  const maxLoan = Math.floor(
    member.balance * ((group?.maxLoanPercent || 50) / 100),
  );

  return {
    totalSaved: member.totalSaved,
    balance: member.balance,
    loanAmount: member.loanBalance,
    loanDueDate:
      member.loanBalance > 0 ? calculateDueDate(group?.maxRepayDays || 30) : 0,
    eligibleToBorrow: maxLoan,
  };
};

// ─────────────────────────────────────────────────────────────
// WEB API METHODS (Admin Dashboard)
// ─────────────────────────────────────────────────────────────

exports.getBalanceForAPI = async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const group = await Group.findById(member.groupId);

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
    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.type !== "borrow") {
      return res.status(404).json({ error: "Loan request not found" });
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "Loan already processed" });
    }

    // Reverse the hold
    const member = await Member.findById(transaction.member);
    const group = await Group.findById(transaction.groupId);

    member.loanBalance -= transaction.amount;
    group.fundBalance += transaction.amount;
    await member.save();
    await group.save();

    transaction.status = "failed";
    transaction.note = `Rejected: ${reason}`;
    transaction.approvedBy = req.admin.id;
    await transaction.save();

    await sendSms(
      member.phone,
      `MkhondeChain: Ngongole yakana. Chifukwa: ${reason}\n` +
        `Loan rejected. Reason: ${reason}`,
    );

    res
      .status(200)
      .json({ message: "Loan rejected", reference: transaction.reference });
  } catch (err) {
    logger.error("REJECT_LOAN_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to reject loan" });
  }
};

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

function calculateDueDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return Math.floor(date.getTime() / 1000); // Unix timestamp
}
