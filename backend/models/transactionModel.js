const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true,
  },
  type: {
    type: String,
    enum: ["save", "borrow", "repay", "interest"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  repaid: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["success", "partial", "pending", "failed"],
    default: "success",
  },
  method: {
    type: String,
    enum: ["USSD", "Admin", "SmartContract"],
    default: "USSD",
  },
  note: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  interest: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);
