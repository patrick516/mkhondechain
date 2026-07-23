// ─────────────────────────────────────────────────────────────
// Mock Airtel Money Gateway
// Simulates real Airtel Money API for development.
// Replace with real Airtel API integration when ready.
// ─────────────────────────────────────────────────────────────

const logger = require("../../utils/logger");

/**
 * Simulate mobile money checkout (member depositing/saving money)
 * @param {string} phoneNumber - Member's phone in +265XXXXXXXXX format
 * @param {number} amount - Amount in MWK
 * @param {string} reference - Unique transaction reference
 * @returns {Promise<{success: boolean, reference: string, provider: string}>}
 */
async function initiateMobileCheckout(phoneNumber, amount, reference) {
  logger.info("MOCK_AIRTEL_CHECKOUT", { phoneNumber, amount, reference });

  // Validate inputs
  if (!phoneNumber || !phoneNumber.match(/^\+265\d{9}$/)) {
    throw new Error("Invalid phone number format");
  }
  if (!amount || amount < 1) {
    throw new Error("Invalid amount");
  }
  if (!reference) {
    throw new Error("Reference is required");
  }

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Simulate occasional failure (5% chance) for testing
  if (Math.random() < 0.05) {
    throw new Error("Airtel Money: Insufficient funds or network error");
  }

  return {
    success: true,
    reference,
    provider: "Airtel Money",
    transactionId: `AIRTEL-DEP-${Date.now()}`,
    phoneNumber,
    amount,
  };
}

/**
 * Simulate sending money to member (loan disbursement)
 * @param {string} phoneNumber - Member's phone in +265XXXXXXXXX format
 * @param {number} amount - Amount in MWK
 * @param {string} reference - Unique transaction reference
 * @returns {Promise<{success: boolean, reference: string, provider: string}>}
 */
async function sendMobileMoney(phoneNumber, amount, reference) {
  logger.info("MOCK_AIRTEL_DISBURSE", { phoneNumber, amount, reference });

  if (!phoneNumber || !phoneNumber.match(/^\+265\d{9}$/)) {
    throw new Error("Invalid phone number format");
  }
  if (!amount || amount < 1) {
    throw new Error("Invalid amount");
  }
  if (!reference) {
    throw new Error("Reference is required");
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  // Simulate occasional failure (3% chance)
  if (Math.random() < 0.03) {
    throw new Error(
      "Airtel Money: Disbursement failed — recipient not registered",
    );
  }

  return {
    success: true,
    reference,
    provider: "Airtel Money",
    transactionId: `AIRTEL-DIS-${Date.now()}`,
    phoneNumber,
    amount,
  };
}

module.exports = {
  initiateMobileCheckout,
  sendMobileMoney,
};
