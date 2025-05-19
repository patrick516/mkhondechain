const LoanRequest = require("../models/loanRequestModel");
const Member = require("../models/memberModel");
const sendSms = require("../utils/africasTalkingSms");

exports.requestLoan = async (req, res) => {
  const { memberId, amount } = req.body;

  if (!memberId || !amount) {
    return res.status(400).json({ error: "memberId and amount are required" });
  }

  try {
    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ error: "Member not found" });

    const loan = await LoanRequest.create({
      member: memberId,
      amount,
      status: "Pending",
    });

    res.status(201).json(loan);
  } catch (error) {
    console.error("Loan request failed:", error.message);
    res.status(500).json({ error: "Failed to request loan" });
  }
};

exports.approveLoan = async (req, res) => {
  const loanId = req.params.id;

  try {
    const loan = await LoanRequest.findByIdAndUpdate(
      loanId,
      { status: "Approved", decisionDate: new Date() },
      { new: true }
    ).populate("member");

    if (!loan) return res.status(404).json({ error: "Loan not found" });

    res.status(200).json(loan);
  } catch (error) {
    console.error("Approve loan failed:", error.message);
    res.status(500).json({ error: "Failed to approve loan" });
  }
};

exports.rejectLoan = async (req, res) => {
  const { phoneNumber, amount, reason } = req.body;

  if (!phoneNumber || !amount || !reason) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const member = await Member.findOne({ phone: phoneNumber });
    if (!member) return res.status(404).json({ error: "Member not found" });

    const loan = await LoanRequest.create({
      member: member._id,
      amount,
      status: "Rejected",
      reason,
      decisionDate: new Date(),
    });

    await sendSms(
      phoneNumber,
      `MkhondeChain: Your loan request for ${amount} was rejected.\nReason: ${reason}`
    );

    res.status(200).json({ message: "Loan rejected and SMS sent", loan });
  } catch (error) {
    console.error("Reject loan failed:", error.message);
    res.status(500).json({ error: "Failed to reject loan" });
  }
};
