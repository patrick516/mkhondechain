require("dotenv").config(); // ✅ Load .env first

const providerName = process.env.PAYMENT_PROVIDER_NAME || "MockGateway";
const env = process.env.PAYMENT_ENVIRONMENT || "sandbox";

async function initiateMobileCheckout(phoneNumber, amount, txId = null) {
  console.log(
    `[${providerName}][${env}] Initiating deposit to ${phoneNumber} for MWK ${amount}`
  );
  return {
    status: "Success",
    message: "Deposit initiated",
    phoneNumber,
    amount,
    txId: txId || `TX-${Date.now()}`,
  };
}

async function sendMobileMoney(phoneNumber, amount) {
  console.log(
    `[${providerName}][${env}] Sending loan to ${phoneNumber} for MWK ${amount}`
  );
  return {
    status: "Success",
    message: "Loan sent",
    phoneNumber,
    amount,
    transactionId: `TX-${Date.now()}`,
  };
}

module.exports = {
  initiateMobileCheckout,
  sendMobileMoney,
};
