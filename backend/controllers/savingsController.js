// ─────────────────────────────────────────────────────────────
// Savings Controller — MkhondeChain
// Handles all savings, loan, and repayment logic.
// Called by ussdRoutes.js and API routes.
// ─────────────────────────────────────────────────────────────

const contract = require("../services/contract");
const { ethers } = require("ethers");
const userService = require("../services/userService");
const {
  initiateMobileCheckout,
  sendMobileMoney,
} = require("../utils/paymentGateway");
const sendSms = require("../utils/africasTalkingSms");
const Member = require("../models/memberModel");
const Transaction = require("../models/transactionModel");
const Audit = require("../models/auditModel");

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// MWK to ETH: 1 ETH = 1000 MWK
const mkToEth = (mk) => (mk / 1000).toString();

// ETH to MWK display
const ethToMK = (eth) => Math.floor(parseFloat(eth) * 1000);

// ─────────────────────────────────────────────────────────────
// USSD METHODS
// ─────────────────────────────────────────────────────────────

/**
 * Save money via USSD — deposits to blockchain on member's behalf
 */
exports.depositViaUSSD = async (phoneNumber, amount, req) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  console.log(`[Deposit] ${phoneNumber} → ${address} | MK${amount}`);

  // Send to blockchain
  const tx = await contract.connect(contract.signer).depositFor(address, {
    value: ethers.utils.parseEther(mkToEth(amount)),
  });
  await tx.wait();
  console.log(`[Deposit] TX Hash: ${tx.hash}`);

  // Update member record
  const member = await Member.findOneAndUpdate(
    { phone: phoneNumber },
    { $inc: { savingsCount: 1, totalSaved: amount } },
    { new: true },
  );

  // Record transaction
  await Transaction.create({
    member: member._id,
    type: "save",
    amount,
    method: "USSD",
    status: "success",
  });

  // Bilingual SMS confirmation
  await sendSms(
    phoneNumber,
    `MkhondeChain: Zachita bwino! MK${amount.toLocaleString()} yasungidwa.\n` +
      `Success! MK${amount.toLocaleString()} saved. Zikomo!`,
  );

  // Live dashboard update
  const io = req.app.get("io");
  if (io) {
    io.emit("transaction:new", {
      member: `${member.firstName} ${member.surname}`,
      type: "Saved",
      amount: `MK ${amount.toLocaleString()}`,
      date: new Date().toISOString(),
    });
  }

  console.log(`[Deposit] Complete for ${phoneNumber}`);
};

// ─────────────────────────────────────────────────────────────

/**
 * Request a loan via USSD
 * FIX: borrowCount only incremented AFTER successful loan
 */
exports.requestLoan = async (phoneNumber, amount, req) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  const amountInWei = ethers.utils.parseEther(mkToEth(amount));

  // Check eligibility FIRST before touching DB
  const canBorrow = await exports.canBorrow(phoneNumber, amount);
  if (!canBorrow) {
    await sendSms(
      phoneNumber,
      `MkhondeChain: Mulibe ndalama yokwanira katenga MK${amount.toLocaleString()}.\n` +
        `Not eligible to borrow MK${amount.toLocaleString()}. Save more first.`,
    );
    throw new Error("Not eligible to borrow this amount");
  }

  // Request loan on blockchain
  try {
    const tx = await contract.requestLoanFor(address, amountInWei, 30);
    await tx.wait();
    console.log(`[Loan] Contract approved. TX: ${tx.hash}`);
  } catch (error) {
    console.error("[Loan] Contract reverted:", error.message);
    await sendSms(
      phoneNumber,
      `MkhondeChain: Ngongole yalephera. ${error.reason || "Exceeds limit"}.\n` +
        `Loan failed. Reason: ${error.reason || "Exceeds eligible limit"}.`,
    );
    throw new Error("Loan contract call failed");
  }

  // NOW update member record (only after success)
  const member = await Member.findOneAndUpdate(
    { phone: phoneNumber },
    { $inc: { borrowCount: 1, totalBorrowed: amount } },
    { new: true },
  );

  // Record transaction
  await Transaction.create({
    member: member._id,
    type: "borrow",
    amount,
    method: "USSD",
    status: "success",
  });

  // Bilingual SMS confirmation
  await sendSms(
    phoneNumber,
    `MkhondeChain: Ngongole yapita! MK${amount.toLocaleString()} yapita ku wallet yanu.\n` +
      `Loan approved! MK${amount.toLocaleString()} sent to your wallet. Repay in 30 days.`,
  );

  // Audit log
  await Audit.create({
    action: "LoanApproved",
    performedBy: "System",
    targetMember: member.phone,
    details: { amount: `MK ${amount}`, method: "USSD", wallet: address },
  });

  // Live dashboard update
  const io = req.app.get("io");
  if (io) {
    io.emit("transaction:new", {
      member: `${member.firstName} ${member.surname}`,
      type: "Borrowed",
      amount: `MK ${amount.toLocaleString()}`,
      date: new Date().toISOString(),
    });
  }

  console.log(`[Loan] Complete for ${phoneNumber}`);
};

// ─────────────────────────────────────────────────────────────

/**
 * Repay loan via USSD — NEW function
 */
exports.repayLoanViaUSSD = async (phoneNumber, amount, req) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  console.log(`[Repay] ${phoneNumber} → MK${amount}`);

  // Repay on blockchain
  const tx = await contract.repayLoanFor(address, {
    value: ethers.utils.parseEther(mkToEth(amount)),
  });
  await tx.wait();
  console.log(`[Repay] TX Hash: ${tx.hash}`);

  // Update member record
  const member = await Member.findOne({ phone: phoneNumber });

  // Record transaction
  await Transaction.create({
    member: member._id,
    type: "repay",
    amount,
    method: "USSD",
    status: "success",
  });

  // Bilingual SMS confirmation
  await sendSms(
    phoneNumber,
    `MkhondeChain: Zachita bwino! MK${amount.toLocaleString()} yabwezedwa.\n` +
      `Repayment successful! MK${amount.toLocaleString()} repaid. Zikomo!`,
  );

  // Audit log
  await Audit.create({
    action: "LoanRepaid",
    performedBy: "System",
    targetMember: member.phone,
    details: { amount: `MK ${amount}`, method: "USSD", wallet: address },
  });

  // Live dashboard update
  const io = req.app.get("io");
  if (io) {
    io.emit("transaction:new", {
      member: `${member.firstName} ${member.surname}`,
      type: "Repaid",
      amount: `MK ${amount.toLocaleString()}`,
      date: new Date().toISOString(),
    });
  }

  console.log(`[Repay] Complete for ${phoneNumber}`);
};

// ─────────────────────────────────────────────────────────────

/**
 * Check if a member is eligible to borrow an amount
 */
exports.canBorrow = async (phoneNumber, amount) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  const [, , , eligibleToBorrow] = await contract.getBalance(address);
  const amountInWei = ethers.utils.parseEther(mkToEth(amount));

  return amountInWei.lte(eligibleToBorrow);
};

// ─────────────────────────────────────────────────────────────

/**
 * Get balance for USSD display
 */
exports.getBalanceForUSSD = async (phoneNumber) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  const [totalSaved, loanAmount, loanDueDate, eligibleToBorrow] =
    await contract.getBalance(address);

  return {
    totalSaved: ethers.utils.formatEther(totalSaved),
    loanAmount: ethers.utils.formatEther(loanAmount),
    loanDueDate: Number(loanDueDate),
    eligibleToBorrow: ethers.utils.formatEther(eligibleToBorrow),
  };
};

// ─────────────────────────────────────────────────────────────
// WEB API METHODS (Admin Dashboard)
// ─────────────────────────────────────────────────────────────

exports.depositViaMobileMoney = async (phoneNumber, amount) => {
  return await initiateMobileCheckout(phoneNumber, amount);
};

exports.sendLoanToMobile = async (phoneNumber, amount) => {
  return await sendMobileMoney(phoneNumber, amount);
};

exports.getBalanceForAPI = async (req, res) => {
  try {
    const address = req.params.address;
    const [totalSaved, loanAmount, loanDueDate, eligibleToBorrow] =
      await contract.getBalance(address);

    res.status(200).json({
      totalSaved: ethers.utils.formatEther(totalSaved),
      loanAmount: ethers.utils.formatEther(loanAmount),
      loanDueDate: Number(loanDueDate),
      eligibleToBorrow: ethers.utils.formatEther(eligibleToBorrow),
    });
  } catch (err) {
    console.error("[Balance API Error]", err.message);
    res.status(500).json({ error: "Failed to get balance" });
  }
};

exports.rejectLoan = async (req, res) => {
  const { phoneNumber, amount, reason } = req.body;
  try {
    await sendSms(
      phoneNumber,
      `MkhondeChain: Ngongole yakana. Chifukwa: ${reason}\n` +
        `Loan rejected. Reason: ${reason}`,
    );
    res.status(200).json({ message: "Rejection SMS sent" });
  } catch (err) {
    console.error("[Reject Loan Error]", err.message);
    res.status(500).json({ error: "Failed to send rejection SMS" });
  }
};
