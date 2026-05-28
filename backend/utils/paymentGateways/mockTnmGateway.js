// ─────────────────────────────────────────────────────────────
// Mock TNM Mpamba Gateway
// Simulates real TNM Mpamba deposit and disbursement behavior.
// Replace this file with the real TNM API integration when ready.
// ─────────────────────────────────────────────────────────────

/**
 * Simulates a mobile money deposit (member saving money)
 * @param {string} phoneNumber - Member's phone number
 * @param {number} amount - Amount in MWK
 * @returns {Promise<object>}
 */
async function initiateMobileCheckout(phoneNumber, amount) {
  console.log(
    `[Mock TNM Mpamba] Deposit request: ${phoneNumber} → MK ${amount.toLocaleString()}`,
  );

  // Simulate a small processing delay like a real API would have
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    status: "Success",
    provider: "TNM Mpamba",
    phoneNumber,
    amount,
    transactionId: `TNM-DEP-${Date.now()}`,
    message: "Deposit initiated successfully",
    entries: [
      {
        status: "Queued",
        transactionId: `TNM-DEP-${Date.now()}`,
      },
    ],
  };
}

/**
 * Simulates sending money to a member's wallet (loan disbursement)
 * @param {string} phoneNumber - Member's phone number
 * @param {number} amount - Amount in MWK
 * @returns {Promise<object>}
 */
async function sendMobileMoney(phoneNumber, amount) {
  console.log(
    `[Mock TNM Mpamba] Disbursement request: ${phoneNumber} ← MK ${amount.toLocaleString()}`,
  );

  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    status: "Success",
    provider: "TNM Mpamba",
    phoneNumber,
    amount,
    transactionId: `TNM-DIS-${Date.now()}`,
    message: "Loan disbursed successfully",
    entries: [
      {
        status: "Queued",
        transactionId: `TNM-DIS-${Date.now()}`,
      },
    ],
  };
}

module.exports = {
  initiateMobileCheckout,
  sendMobileMoney,
};
