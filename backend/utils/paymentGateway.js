// ─────────────────────────────────────────────────────────────
// Payment Gateway Selector
// Reads PAYMENT_PROVIDER from .env and loads the correct gateway.
//
// Supported values:
//   mock_airtel  → Mock Airtel Money (default)
//   mock_tnm     → Mock TNM Mpamba
//   airtel       → Real Airtel Money API (when ready)
//   tnm          → Real TNM Mpamba API (when ready)
// ─────────────────────────────────────────────────────────────

require("dotenv").config();
const logger = require("./logger");

const provider = (process.env.PAYMENT_PROVIDER || "mock_airtel").toLowerCase();

let gateway;

switch (provider) {
  case "mock_airtel":
    gateway = require("./paymentGateways/mockAirtelGateway");
    logger.info("PAYMENT_GATEWAY_LOADED", { provider: "Mock Airtel Money" });
    break;

  case "mock_tnm":
    gateway = require("./paymentGateways/mockTnmGateway");
    logger.info("PAYMENT_GATEWAY_LOADED", { provider: "Mock TNM Mpamba" });
    break;

  case "airtel":
    // gateway = require("./paymentGateways/airtelGateway"); // Uncomment when ready
    logger.warn("PAYMENT_GATEWAY_NOT_READY", {
      provider: "Airtel Money (real)",
    });
    gateway = require("./paymentGateways/mockAirtelGateway");
    break;

  case "tnm":
    // gateway = require("./paymentGateways/tnmGateway"); // Uncomment when ready
    logger.warn("PAYMENT_GATEWAY_NOT_READY", { provider: "TNM Mpamba (real)" });
    gateway = require("./paymentGateways/mockTnmGateway");
    break;

  default:
    logger.warn("PAYMENT_GATEWAY_UNKNOWN", {
      provider,
      fallback: "Mock Airtel Money",
    });
    gateway = require("./paymentGateways/mockAirtelGateway");
}

// Validate gateway interface
const requiredMethods = ["initiateMobileCheckout", "sendMobileMoney"];
for (const method of requiredMethods) {
  if (typeof gateway[method] !== "function") {
    throw new Error(`Payment gateway missing required method: ${method}`);
  }
}

module.exports = gateway;
