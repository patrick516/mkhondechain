const {
  initiateMobileCheckout,
  sendMobileMoney,
} = require("../utils/paymentGateway");

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

    const result = await initiateMobileCheckout(phoneNumber, amount);

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
    console.error("❌ Full deposit error:", error); // Log full stack
    res.status(500).json({ error: "Deposit has  failed" });
  }
};

// POST /api/payments/disburse
exports.disburseLoanToMobile = async (req, res) => {
  const { phoneNumber, amount } = req.body;

  if (!phoneNumber || !amount) {
    return res.status(400).json({ error: "Missing phone number or amount" });
  }

  try {
    const result = await sendMobileMoney(phoneNumber, amount);
    res.status(200).json(result);
  } catch (error) {
    console.error("Disbursement failed:", error.message);
    res.status(500).json({ error: "Failed to send loan" });
  }
};
