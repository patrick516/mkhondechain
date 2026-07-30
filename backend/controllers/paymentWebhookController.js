// Payment Webhook Controller
// Receives asynchronous payment confirmations from the mobile
// money provider (Airtel Money / TNM Mpamba). This is a SCAFFOLD
// for now — the mock gateways confirm instantly and never call
// this endpoint. When real gateways are wired in later, this is
// where their confirmation callbacks will land.
//
// SECURITY: this endpoint has NO admin JWT — it's called by an
// external server, not a logged-in user. Verification instead
// relies on a shared secret / signature check (verifyWebhookAuth
// below). This MUST be replaced with the real provider's actual
// signature scheme before going live — a guessed shared secret
// alone is a weak substitute for real signature verification.
// ─────────────────────────────────────────────────────────────

const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");

// ─────────────────────────────────────────────────────────────
// TODO (before real integration): replace with the provider's
// actual signature verification (e.g. HMAC of the raw body using
// a provider-issued signing secret, per their documentation).
// This placeholder just checks a shared secret header.
// ─────────────────────────────────────────────────────────────
function verifyWebhookAuth(req) {
  const providedSecret = req.headers["x-webhook-secret"];
  return (
    providedSecret &&
    process.env.PAYMENT_WEBHOOK_SECRET &&
    providedSecret === process.env.PAYMENT_WEBHOOK_SECRET
  );
}

// POST /api/payments/webhook
exports.handlePaymentWebhook = async (req, res) => {
  if (!verifyWebhookAuth(req)) {
    logger.security.unauthorizedAccess(req.ip, req.path, null);
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  // ───────────────────────────────────────────────────────────
  // TODO (before real integration): map the REAL provider payload
  // shape to these three values. Every provider names fields
  // differently — this generic shape is a placeholder until we
  // see Airtel/TNM's actual callback documentation.
  // ───────────────────────────────────────────────────────────
  const { reference, status, providerRef } = req.body;

  if (!reference || !status) {
    return res.status(400).json({ error: "Missing reference or status" });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      logger.error("WEBHOOK_UNKNOWN_REFERENCE", { reference });
      // Still return 200 — telling the provider "not found" via an
      // error status often triggers pointless retries on their side.
      return res.status(200).json({ received: true });
    }

    if (transaction.status !== "pending") {
      // Already processed — webhooks can arrive more than once.
      // Acknowledge without reprocessing (idempotency).
      logger.info("WEBHOOK_ALREADY_PROCESSED", { reference });
      return res.status(200).json({ received: true });
    }

    const newStatus = status === "success" ? "success" : "failed";

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: newStatus,
        mobileMoneyRef: providerRef || transaction.mobileMoneyRef,
      },
    });

    logger.info("WEBHOOK_TRANSACTION_UPDATED", {
      reference,
      newStatus,
    });

    // TODO (before real integration): if newStatus is "failed",
    // this needs the same balance-reversal logic used elsewhere
    // (see approveAndDisburseLoan's failure path in
    // savingsController.js) — a failed async confirmation must
    // roll back whatever balance change was optimistically applied.

    res.status(200).json({ received: true });
  } catch (err) {
    logger.error("WEBHOOK_PROCESSING_ERROR", {
      reference,
      error: err.message,
    });
    // Still 200 — a provider retrying an errored webhook indefinitely
    // is worse than us catching and logging it for manual review.
    res.status(200).json({ received: true });
  }
};
