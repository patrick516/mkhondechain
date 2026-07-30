// ─────────────────────────────────────────────────────────────
// File: backend/utils/textbeeSms.js
// ─────────────────────────────────────────────────────────────
// TextBee SMS sender — used ONLY for broadcast messages and
// share-out summaries. Everything else (save/borrow/repay/PIN
// confirmations) stays on Africa's Talking, in africasTalkingSms.js.
//
// NOTE: TextBee's exact request shape may need adjusting once
// tested against a real account — verify against their current
// API docs before relying on this in production.
// ─────────────────────────────────────────────────────────────

const logger = require("./logger");

async function sendTextBeeSms(phone, message) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey || !deviceId) {
    throw new Error("TextBee not configured (missing API key or device ID)");
  }

  const url = `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      recipients: [phone],
      message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("TEXTBEE_SEND_FAILED", {
      phone,
      status: response.status,
      error: errorText,
    });
    throw new Error(`TextBee SMS failed: ${response.status}`);
  }

  return response.json();
}

module.exports = sendTextBeeSms;
