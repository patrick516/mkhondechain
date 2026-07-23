// ─────────────────────────────────────────────────────────────
// Africa's Talking SMS Utility
// SMS failure must NEVER crash the financial transaction flow.
// The transaction already succeeded in the database even if SMS fails.
// ─────────────────────────────────────────────────────────────

require("dotenv").config();
const africastalking = require("africastalking");
const logger = require("../utils/logger");

const at = africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

/**
 * Normalize phone number to +265XXXXXXXXX format
 */
function normalizePhone(phone) {
  const cleaned = phone.replace(/\s/g, "").replace(/^0/, "+265");
  if (!cleaned.match(/^\+265\d{9}$/)) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }
  return cleaned;
}

/**
 * Send SMS with retry logic
 * @param {string} phone - Phone number
 * @param {string} message - Message body (max 160 chars for single SMS)
 * @param {number} retries - Number of retry attempts
 */
const sendSms = async (phone, message, retries = 2) => {
  const normalizedPhone = normalizePhone(phone);

  // Truncate if too long (Africa's Talking handles multipart, but costs more)
  const truncatedMessage =
    message.length > 480 ? message.substring(0, 477) + "..." : message;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await at.SMS.send({
        to: [normalizedPhone],
        message: truncatedMessage,
        // from: process.env.AT_SHORTCODE || "MkhondeChain",
      });

      const recipients = result?.SMSMessageData?.Recipients || [];
      const successful = recipients.filter((r) => r.status === "Success");

      if (successful.length > 0) {
        logger.info("SMS_SENT", {
          phone: normalizedPhone,
          messageLength: truncatedMessage.length,
          cost: result?.SMSMessageData?.Message,
        });
        return { success: true, recipients: successful };
      }

      // If not successful and we have retries left, wait and retry
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    } catch (error) {
      logger.error("SMS_SEND_ERROR", {
        phone: normalizedPhone,
        attempt: attempt + 1,
        error: error.message,
      });

      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }
  }

  // All retries exhausted
  logger.error("SMS_FAILED_PERMANENTLY", {
    phone: normalizedPhone,
    message: truncatedMessage.substring(0, 50),
  });

  return { success: false, error: "SMS delivery failed after retries" };
};

module.exports = sendSms;
