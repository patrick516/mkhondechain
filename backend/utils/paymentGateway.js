require("dotenv").config();

// Currently, we only support PayChangu
const gateway = require("./paymentGateways/payChanguGateway");

module.exports = gateway;
