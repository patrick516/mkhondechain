const paychanguGateway = require("../utils/paymentGateways/payChanguGateway");
const Member = require("../models/memberModel");

// POST /api/payments/deposit
exports.depositViaMobileMoney = async (req, res) => {
  const { phoneNumber, amount } = req.body;

  if (!phoneNumber || !amount) {
    return res.status(400).json({ error: "Missing phone number or amount" });
  }

  try {
    const member = await Member.findOne({ phone: phoneNumber });
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const result = await paychanguGateway.deposit(phoneNumber, amount);

    if (!result || result.status !== "Queued") {
      return res.status(500).json({ error: "Deposit failed via PayChangu" });
    }

    const io = req.app?.get?.("io");
    if (io) {
      io.emit("transaction:new", {
        member: `${member.firstName} ${member.surname}`,
        type: "Saved (Mobile)",
        amount: `MK ${amount.toLocaleString()}`,
        date: new Date().toISOString(),
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Full deposit error:", error);
    res.status(500).json({ error: "Deposit has failed" });
  }
};

// POST /api/payments/disburse
exports.disburseLoanToMobile = async (req, res) => {
  const { phoneNumber, amount } = req.body;

  if (!phoneNumber || !amount) {
    return res.status(400).json({ error: "Missing phone number or amount" });
  }

  try {
    const result = await paychanguGateway.cashout(phoneNumber, amount);

    if (!result || result.status !== "Queued") {
      return res
        .status(500)
        .json({ error: "Loan disbursement failed via PayChangu" });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Disbursement failed:", error.message);
    res.status(500).json({ error: "Failed to send loan" });
  }
};
