// ─────────────────────────────────────────────────────────────
// Africa's Talking SMS Utility
//
// IMPORTANT: SMS failure must NEVER crash the USSD flow.
// We log errors silently and continue — the transaction
// already succeeded on blockchain even if SMS fails.
//
// Sandbox note: In AT sandbox, SMS is only delivered to
// numbers registered in your sandbox test accounts.
// USSD simulator works regardless.
// ─────────────────────────────────────────────────────────────

require("dotenv").config();
const africastalking = require("africastalking");

const at = africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sendSms = async (phone, message) => {
  try {
    const result = await at.SMS.send({
      to: [phone],
      message,
      // from: "MkhondeChain", // uncomment when shortcode is approved
    });
    console.log(
      `[SMS] Sent to ${phone}:`,
      result?.SMSMessageData?.Message || "OK",
    );
  } catch (error) {
    // Log the error but NEVER throw — SMS failure must not crash USSD
    console.error(`[SMS] Failed to send to ${phone}:`, error.message);
  }
};

module.exports = sendSms;
