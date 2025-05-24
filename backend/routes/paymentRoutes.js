const express = require("express");
const router = express.Router();
const savingsController = require("../controllers/savingsController");

// Mobile money (Airtel/TNM or mock)
router.post("/deposit", async (req, res) => {
  const { phoneNumber, amount } = req.body;

  try {
    const result = await savingsController.depositViaMobileMoney(
      phoneNumber,
      amount
    );
    res.status(200).json({ message: "Deposit initiated", result });
  } catch (err) {
    console.error("Mobile deposit error:", err.message);
    res.status(500).json({ error: "Mobile deposit failed" });
  }
});

router.post("/disburse", async (req, res) => {
  const { phoneNumber, amount } = req.body;

  try {
    const result = await savingsController.sendLoanToMobile(
      phoneNumber,
      amount
    );
    res.status(200).json({ message: "Loan disbursed", result });
  } catch (err) {
    console.error("Disbursement error:", err.message);
    res.status(500).json({ error: "Loan disbursement failed" });
  }
});

module.exports = router;
