// ─────────────────────────────────────────────────────────────
// User Model
// Links a Malawian phone number to an Ethereum wallet address.
// Used by the USSD system to find the correct wallet for a caller.
// This is NOT the admin login model — see Admin.js for that.
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
