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
    const result = await initiateMobileCheckout(phoneNumber, amount);
    res.status(200).json(result);
  } catch (error) {
    console.error("Deposit failed:", error.message);
    res.status(500).json({ error: "Failed to initiate deposit" });
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
