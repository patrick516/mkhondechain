const paychanguGateway = require("../utils/paymentGateways/paychanguGateway");
const Transaction = require("../models/transactionModel");
const Member = require("../models/memberModel");
const sendSms = require("../utils/africasTalkingSms");

exports.handlePayChanguWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paychangu-signature"];
    const rawBody = req.rawBody;

    if (!paychanguGateway.verifyWebhook(rawBody, signature)) {
      console.warn("Invalid webhook signature");
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;
    const { transactionId, status, phoneNumber } = event;

    const tx = await Transaction.findOne({ payChanguId: transactionId });
    if (!tx) {
      console.warn("Transaction not found for webhook:", transactionId);
      return res.status(404).send("Transaction not found");
    }

    // Normalize status
    const normalizedStatus =
      status.toLowerCase() === "success"
        ? "success"
        : status.toLowerCase() === "pending"
          ? "pending"
          : "failed";

    tx.status = normalizedStatus;
    await tx.save();

    // Optional: Notify member
    const member = await Member.findById(tx.member);
    if (member) {
      await sendSms(
        phoneNumber,
        `Your transaction of MK${tx.amount.toLocaleString()} is ${normalizedStatus.toUpperCase()}.`,
      );
    }

    console.log(
      `Transaction ${transactionId} updated to status ${normalizedStatus}`,
    );
    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    res.status(500).send("Webhook error");
  }
};
