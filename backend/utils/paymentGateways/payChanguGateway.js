// utils/paymentGateways/paychanguGateway.js
require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const Transaction = require("../../models/transactionModel"); // Import Transaction model

const PAYCHANGU_API_KEY = process.env.PAYCHANGU_API_KEY;
const PAYCHANGU_BASE_URL =
  process.env.PAYCHANGU_BASE_URL || "https://api.paychangu.com";
const PAYCHANGU_WEBHOOK_SECRET = process.env.PAYCHANGU_WEBHOOK_SECRET;

/**
 * Initiates a mobile money deposit
 * @param {string} phoneNumber
 * @param {number} amount
 * @returns {Promise<object>}
 */
async function deposit(phoneNumber, amount) {
  try {
    const response = await axios.post(
      `${PAYCHANGU_BASE_URL}/mobile/deposit`,
      { phoneNumber, amount },
      {
        headers: {
          Authorization: `Bearer ${PAYCHANGU_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Save transaction with pending status
    await Transaction.create({
      member: null, // optionally update later via webhook
      type: "save",
      amount,
      status: "pending",
      method: "Mobile",
      payChanguId: response.data.transactionId, // store PayChangu transaction ID
    });

    return response.data;
  } catch (error) {
    console.error(
      "PayChangu deposit error:",
      error.response?.data || error.message,
    );
    throw new Error("Deposit failed via PayChangu");
  }
}

/**
 * Sends money to a mobile wallet (loan disbursement)
 * @param {string} phoneNumber
 * @param {number} amount
 * @returns {Promise<object>}
 */
async function cashout(phoneNumber, amount) {
  try {
    const response = await axios.post(
      `${PAYCHANGU_BASE_URL}/mobile/cashout`,
      { phoneNumber, amount },
      {
        headers: {
          Authorization: `Bearer ${PAYCHANGU_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Save cashout transaction as pending
    await Transaction.create({
      member: null,
      type: "borrow",
      amount,
      status: "pending",
      method: "Mobile",
      payChanguId: response.data.transactionId,
    });

    return response.data;
  } catch (error) {
    console.error(
      "PayChangu cashout error:",
      error.response?.data || error.message,
    );
    throw new Error("Cashout failed via PayChangu");
  }
}

/**
 * Verifies webhook signature from PayChangu
 * @param {string} rawBody
 * @param {string} signatureHeader
 * @returns {boolean}
 */
function verifyWebhook(rawBody, signatureHeader) {
  const hash = crypto
    .createHmac("sha256", PAYCHANGU_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return hash === signatureHeader;
}

module.exports = {
  deposit,
  cashout,
  verifyWebhook,
};
