require("dotenv").config();

const PAYMENT_PROVIDER_NAME =
  process.env.PAYMENT_PROVIDER_NAME?.toLowerCase() || "mock";

let gateway;

switch (PAYMENT_PROVIDER_NAME) {
  case "airtel":
    gateway = require("./paymentGateways/airtelGateway");
    break;
  case "tnm":
    gateway = require("./paymentGateways/tnmGateway");
    break;
  case "mock":
  case "mockairtelgateway":
    gateway = require("./paymentGateways/mockGateway");
    break;
  default:
    console.warn(
      `Unknown PAYMENT_PROVIDER_NAME: '${process.env.PAYMENT_PROVIDER_NAME}', falling back to mockGateway.`
    );
    gateway = require("./paymentGateways/mockGateway");
    break;
}

module.exports = gateway;
