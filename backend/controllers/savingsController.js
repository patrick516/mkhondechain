const contract = require("../services/contract");
const { ethers } = require("ethers");
const userService = require("../services/userService");
const at = require("../services/africasTalking");
const {
  initiateMobileCheckout,
  sendMobileMoney,
} = require("../utils/africasTalkingPayments");

// ─────────────────────────────
// WEB API METHODS (for frontend)
// ─────────────────────────────

exports.deposit = async (req, res) => {
  try {
    const { amount, address } = req.body;

    const tx = await contract
      .connect(contract.signer)
      .deposit({ value: ethers.utils.parseEther(amount.toString()) });
    await tx.wait();

    res.status(200).json({ message: "Deposit successful", txHash: tx.hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Deposit failed" });
  }
};

// Mobile Money: Save via Airtel/Mpamba (Mocked or Real)
exports.depositViaMobileMoney = async (phoneNumber, amount) => {
  const result = await initiateMobileCheckout(phoneNumber, amount);
  return result;
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: "Loan request failed" });
  }
};

// Mobile Money: Borrow via B2C (Mocked or Real)
exports.sendLoanToMobile = async (phoneNumber, amount) => {
  const result = await sendMobileMoney(phoneNumber, amount);
  return result;
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
    console.error(err);
    res.status(500).json({ error: "Repayment failed" });
  }
};

// ─────────────────────────────
// USSD METHODS (for /ussd route)
// ─────────────────────────────

exports.depositViaUSSD = async (phoneNumber, amount) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  console.log("[depositViaUSSD] Phone:", phoneNumber);
  console.log("[depositViaUSSD] Wallet Address:", address);
  console.log("[depositViaUSSD] Amount:", amount);

  if (!address) throw new Error("Wallet address not found");

  try {
    const tx = await contract.connect(contract.signer).depositFor(address, {
      value: ethers.utils.parseEther((amount / 1000).toString()),
    });

    await tx.wait();
    console.log("Deposit successful. Tx:", tx.hash);

    //  Send confirmation SMS
    const sms = at.SMS;
    await sms.send({
      to: [`+${phoneNumber}`],
      message: `MkhondeChain: You’ve successfully saved MK${amount.toLocaleString()}.`,
      from: "Mkhonde",
    });

    console.log(" SMS sent to", phoneNumber);
  } catch (error) {
    console.error("Smart contract call or SMS failed:", error.message);
    throw new Error("Deposit failed");
  }
};

exports.getBalanceForUSSD = async (phoneNumber) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);

  console.log("Checking balance for phone:", phoneNumber);
  console.log("Mapped ETH address:", address);

  if (!address) throw new Error("Wallet address not found");

  try {
    const [totalSaved, loanAmount, loanDueDate, eligibleToBorrow] =
      await contract.getBalance(address);

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
  } catch (err) {
    console.error("Smart contract call failed:", err.message);
    throw new Error("Cannot get balance — you may need to save first.");
  }
};

exports.canBorrow = async (phoneNumber, amount) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  const [, , , eligibleToBorrow] = await contract.getBalance(address);
  return ethers.utils.parseEther(amount.toString()).lte(eligibleToBorrow);
};

exports.requestLoan = async (phoneNumber, amount) => {
  const address = await userService.getWalletAddressByPhone(phoneNumber);
  if (!address) throw new Error("Wallet address not found");

  const tx = await contract.requestLoan(
    ethers.utils.parseEther(amount.toString()),
    30
  );
  await tx.wait();
};

exports.rejectLoan = async (req, res) => {
  const { phoneNumber, amount, reason } = req.body;

  try {
    // Optional: log to DB if needed

    const sendSms = require("../utils/africasTalkingSms");

    await sendSms(
      phoneNumber,
      `Your loan request for ${amount} was rejected. Reason: ${reason}`
    );

    return res.status(200).json({ message: "Rejection handled and SMS sent" });
  } catch (error) {
    console.error("Reject loan failed:", error.message);
    return res.status(500).json({ error: "Failed to send rejection" });
  }
};
