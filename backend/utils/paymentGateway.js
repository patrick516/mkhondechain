// ─────────────────────────────────────────────────────────────
// Payment Gateway Selector
// Reads PAYMENT_PROVIDER from .env and loads the correct gateway.
//
// Supported values for PAYMENT_PROVIDER in .env:
//   mock_airtel  → uses mockAirtelGateway (default)
//   mock_tnm     → uses mockTnmGateway
//
// When real APIs are ready, add:
//   airtel       → real Airtel Money API
//   tnm          → real TNM Mpamba API
// ─────────────────────────────────────────────────────────────

require("dotenv").config();

const provider = (process.env.PAYMENT_PROVIDER || "mock_airtel").toLowerCase();

let gateway;

switch (provider) {
  case "mock_airtel":
    gateway = require("./paymentGateways/mockAirtelGateway");
    console.log("[PaymentGateway] Using: Mock Airtel Money");
    break;

  case "mock_tnm":
    gateway = require("./paymentGateways/mockTnmGateway");
    console.log("[PaymentGateway] Using: Mock TNM Mpamba");
    break;

  default:
    console.warn(
      `[PaymentGateway] Unknown PAYMENT_PROVIDER: '${provider}'. Falling back to Mock Airtel Money.`,
    );
    gateway = require("./paymentGateways/mockAirtelGateway");
}

module.exports = gateway;
