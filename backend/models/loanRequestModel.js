const mongoose = require("mongoose");

const loanRequestSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  reason: {
    type: String,
    default: null, // only used when rejected
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  decisionDate: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model("LoanRequest", loanRequestSchema);
