// ─────────────────────────────────────────────────────────────
// Payment Controller
// Handles deposit and loan disbursement via the payment gateway.
// The gateway (Airtel/TNM/mock) is configured in .env
// ─────────────────────────────────────────────────────────────

const {
  initiateMobileCheckout,
  sendMobileMoney,
} = require("../utils/paymentGateway");
const Member = require("../models/memberModel");
const Transaction = require("../models/transactionModel");

/**
 * POST /api/payments/deposit
 * Initiates a mobile money deposit for a member
 */
exports.depositViaMobileMoney = async (req, res) => {
  const { phoneNumber, amount } = req.body;

  if (!phoneNumber || !amount) {
    return res
      .status(400)
      .json({ error: "Phone number and amount are required" });
  }

  try {
    const member = await Member.findOne({ phone: phoneNumber });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const result = await initiateMobileCheckout(phoneNumber, Number(amount));

    // Record transaction in DB
    await Transaction.create({
      member: member._id,
      type: "save",
      amount: Number(amount),
      method: "Mobile Money",
      status: "pending",
    });

    // Emit real-time event to dashboard
    const io = req.app?.get("io");
    if (io) {
      io.emit("transaction:new", {
        member: `${member.firstName} ${member.surname}`,
        type: "Saved",
        amount: `MK ${Number(amount).toLocaleString()}`,
        date: new Date().toISOString(),
      });
    }

    res.status(200).json({ message: "Deposit initiated", result });
  } catch (error) {
    console.error("Deposit error:", error.message);
    res.status(500).json({ error: "Deposit failed" });
  }
};

/**
 * POST /api/payments/disburse
 * Sends loan money to a member's mobile wallet
 */
exports.disburseLoanToMobile = async (req, res) => {
  const { phoneNumber, amount } = req.body;

  if (!phoneNumber || !amount) {
    return res
      .status(400)
      .json({ error: "Phone number and amount are required" });
  }

  try {
    const member = await Member.findOne({ phone: phoneNumber });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const result = await sendMobileMoney(phoneNumber, Number(amount));

    // Record transaction in DB
    await Transaction.create({
      member: member._id,
      type: "borrow",
      amount: Number(amount),
      method: "Mobile Money",
      status: "pending",
    });

    // Emit real-time event to dashboard
    const io = req.app?.get("io");
    if (io) {
      io.emit("transaction:new", {
        member: `${member.firstName} ${member.surname}`,
        type: "Borrowed",
        amount: `MK ${Number(amount).toLocaleString()}`,
        date: new Date().toISOString(),
      });
    }

    res.status(200).json({ message: "Loan disbursed", result });
  } catch (error) {
    console.error("Disbursement error:", error.message);
    res.status(500).json({ error: "Disbursement failed" });
  }
};
