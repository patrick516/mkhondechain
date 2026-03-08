const contract = require("../services/contract");
const { ethers } = require("ethers");
const userService = require("../services/userService");
const {
  initiateMobileCheckout,
  sendMobileMoney,
} = require("../utils/paymentGateway");
const sendSms = require("../utils/africasTalkingSms");
const SystemSetting = require("../models/systemSettingModel");
const Member = require("../models/memberModel");
const Transaction = require("../models/transactionModel");
const Audit = require("../models/auditModel");

// ─────────────────────────────
// WEB API METHODS (Admin Dashboard / Frontend)
// ─────────────────────────────

exports.deposit = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne();
    if (!setting?.savingWindowOpen) {
      return res.status(403).json({
        error:
          "Group saving day is closed. Wait for the next window to deposit.",
      });
    }

    const { amount, address } = req.body;

    const tx = await contract
      .connect(contract.signer)
      .deposit({ value: ethers.utils.parseEther(amount.toString()) });

    await tx.wait();

    res.status(200).json({ message: "Deposit successful", txHash: tx.hash });
  } catch (err) {
    console.error("Smart contract deposit error:", err.message);
    res.status(500).json({ error: "Deposit failed" });
  }
};

exports.depositViaMobileMoney = async (phoneNumber, amount) => {
  return await initiateMobileCheckout(phoneNumber, amount);
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
    console.error("Balance fetch error:", err.message);
    res.status(500).json({ error: "Failed to get balance" });
  }
};

exports.borrow = async (req, res) => {
  try {
    const { amount, daysToRepay } = req.body;

    const tx = await contract.requestLoan(
      ethers.utils.parseEther(amount.toString()),
      daysToRepay
    );
    await tx.wait();

    res.status(200).json({ message: "Loan granted", txHash: tx.hash });
  } catch (err) {
    console.error("Loan request error:", err.message);
    res.status(500).json({ error: "Loan request failed" });
  }
};

exports.sendLoanToMobile = async (phoneNumber, amount) => {
  return await sendMobileMoney(phoneNumber, amount);
};

exports.repay = async (req, res) => {
  try {
    const { amount } = req.body;

    const tx = await contract.repayLoan({
      value: ethers.utils.parseEther(amount.toString()),
    });
    await tx.wait();

    res.status(200).json({ message: "Loan repaid", txHash: tx.hash });
  } catch (err) {
    console.error("Repayment error:", err.message);
    res.status(500).json({ error: "Repayment failed" });
  }
};

// ─────────────────────────────
// USSD-SPECIFIC METHODS
// ─────────────────────────────

exports.depositViaUSSD = async (phoneNumber, amount, req) => {
  const Member = require("../models/memberModel");
  const Transaction = require("../models/transactionModel");

  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  console.log("Wallet resolved for", phoneNumber, "→", address);
  console.log(`Preparing deposit: MWK ${amount} → ETH ${amount / 1000}`);

  try {
    console.log("Sending deposit transaction to contract...");

    const tx = await contract.connect(contract.signer).depositFor(address, {
      value: ethers.utils.parseEther((amount / 1000).toString()),
    });

    await tx.wait();
    console.log(` Deposit successful. TX Hash: ${tx.hash}`);

    const member = await Member.findOneAndUpdate(
      { phone: phoneNumber },
      { $inc: { savingsCount: 1 } },
      { new: true }
    );

    await Transaction.create({
      member: member._id,
      type: "save",
      amount,
      method: "USSD",
    });

    await sendSms(
      phoneNumber,
      `MkhondeChain: You’ve successfully saved MK${amount.toLocaleString()}.`
    );

    const io = req.app.get("io");
    io.emit("transaction:new", {
      member: `${member.firstName} ${member.surname}`,
      type: "Saved",
      amount: `MK ${amount.toLocaleString()}`,
      date: new Date().toLocaleDateString(),
    });

    console.log("Socket emitted: transaction:new");
    console.log("Deposit via USSD successful");
  } catch (err) {
    console.error("USSD deposit error:", err.message);
    throw new Error("Deposit failed");
  }
};

exports.getBalanceForUSSD = async (phoneNumber) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  console.log("USSD phone:", phoneNumber);
  console.log("Wallet address from DB:", address);

  const [totalSaved, loanAmount, loanDueDate, eligibleToBorrow] =
    await contract.getBalance(address);

  console.log("💰 totalSaved (ETH):", ethers.utils.formatEther(totalSaved));
  console.log(
    "✅ eligibleToBorrow (ETH):",
    ethers.utils.formatEther(eligibleToBorrow)
  );

  return {
    display: `💰 Saved: MK${(
      parseFloat(totalSaved) * 1000
    ).toLocaleString()}\n💳 Loan: MK${(
      parseFloat(loanAmount) * 1000
    ).toLocaleString()}\n✅ Can Borrow: MK${(
      parseFloat(eligibleToBorrow) * 1000
    ).toLocaleString()}`,
    totalSaved: ethers.utils.formatEther(totalSaved),
    loanAmount: ethers.utils.formatEther(loanAmount),
    loanDueDate: Number(loanDueDate),
    eligibleToBorrow: ethers.utils.formatEther(eligibleToBorrow),
  };
};

exports.canBorrow = async (phoneNumber, amount) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  const [, , , eligibleToBorrow] = await contract.getBalance(address);
  const amountInEth = ethers.utils.parseEther((amount / 1000).toString());
  return amountInEth.lte(eligibleToBorrow);
};

exports.requestLoan = async (phoneNumber, amount, req) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  const [totalSaved] = await contract.getBalance(address);
  const maxAllowed = totalSaved.mul(80).div(100);
  const amountInWei = ethers.utils.parseEther((amount / 1000).toString());

  const member = await Member.findOneAndUpdate(
    { phone: phoneNumber },
    { $inc: { borrowCount: 1 } },
    { new: true }
  );

  const io = req.app.get("io");

  // Emit loan request for frontend to handle
  io.emit("loan:request", {
    member: `${member.firstName} ${member.surname}`,
    amount: `MK ${amount.toLocaleString()}`,
    wallet: address,
    memberPhone: phoneNumber,
  });

  if (amountInWei.gt(maxAllowed)) {
    const maxMK = parseFloat(ethers.utils.formatEther(maxAllowed)) * 1000;
    await sendSms(
      phoneNumber,
      `Loan exceeds 80%. Max allowed: MK${Math.floor(maxMK).toLocaleString()}`
    );
    return;
  }

  try {
    const tx = await contract.requestLoanFor(address, amountInWei, 30);
    await tx.wait();
  } catch (error) {
    console.error("Contract reverted:", error.message);
    await sendSms(
      phoneNumber,
      `Loan failed. Reason: ${error.reason || "exceeds limit"}`
    );
    return;
  }

  await Transaction.create({
    member: member._id,
    type: "borrow",
    amount,
    method: "USSD",
  });
  await sendSms(
    phoneNumber,
    `MkhondeChain: Your loan of MK${amount.toLocaleString()} has been approved and disbursed.`
  );

  //  Log audit
  await Audit.create({
    action: "AutoApproveLoan",
    performedBy: "System",
    targetMember: member.phone,
    details: {
      amount: `MK ${amount}`,
      method: "USSD",
      wallet: address,
    },
  });

  io.emit("transaction:new", {
    member: `${member.firstName} ${member.surname}`,
    action: "Borrowed",
    amount: `MK ${amount.toLocaleString()}`,
    date: new Date().toISOString(),
  });

  console.log("✅ Loan saved and emitted");
};

exports.rejectLoan = async (req, res) => {
  const { phoneNumber, amount, reason } = req.body;

  try {
    await sendSms(
      phoneNumber,
      `Your loan request for ${amount} was rejected. Reason: ${reason}`
    );

    res.status(200).json({ message: "Rejection handled and SMS sent" });
  } catch (err) {
    console.error("Reject loan error:", err.message);
    res.status(500).json({ error: "Failed to send rejection" });
  }
};
