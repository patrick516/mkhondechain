require("dotenv").config();
const africastalking = require("africastalking");

const at = africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const isPaymentsAvailable = !!(at.PAYMENTS && at.PAYMENTS.mobileCheckout);

console.log(`🟡 Payments API Available: ${isPaymentsAvailable}`);

const initiateMobileCheckout = async (phoneNumber, amount) => {
  if (!isPaymentsAvailable) {
    console.log(`[MOCK] Mobile checkout for ${phoneNumber} - MWK ${amount}`);
    return { status: "PendingConfirmation" };
  }

  return at.PAYMENTS.mobileCheckout({
    productName: process.env.PRODUCT_NAME,
    phoneNumber,
    currencyCode: "MWK",
    amount: amount.toString(),
    metadata: { reason: "savings" },
  });
};

const sendMobileMoney = async (phoneNumber, amount) => {
  if (!isPaymentsAvailable) {
    console.log(`[MOCK] B2C mobile money to ${phoneNumber} - MWK ${amount}`);
    return {
      entries: [
        {
          phoneNumber,
          status: "Queued",
          amount,
          transactionId: "MOCK-TX123456",
        },
      ],
    };
  }

  return at.PAYMENTS.mobileB2CRequest({
    productName: process.env.PRODUCT_NAME,
    recipients: [
      {
        phoneNumber,
        currencyCode: "MWK",
        amount: amount.toString(),
        metadata: { reason: "loan" },
      },
    ],
  });
};

module.exports = {
  initiateMobileCheckout,
  sendMobileMoney,
};
