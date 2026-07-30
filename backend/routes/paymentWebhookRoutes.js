// No `auth` middleware here — this is called by an external
// server (the payment provider), not a logged-in admin.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const {
  handlePaymentWebhook,
} = require("../controllers/paymentWebhookController");

router.post("/", handlePaymentWebhook);

module.exports = router;
