// ─────────────────────────────────────────────────────────────
// Transaction Model
// Immutable financial record — append-only.
// Every transaction has a unique reference for idempotency.
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: [true, "Transaction reference is required"],
      unique: true,
      index: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    type: {
      type: String,
      enum: {
        values: ["save", "borrow", "repay", "interest", "fee", "reversal"],
        message: "Invalid transaction type",
      },
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    beforeBalance: {
      type: Number,
      required: true,
    },
    afterBalance: {
      type: Number,
      required: true,
    },
    beforeLoanBalance: {
      type: Number,
      default: 0,
    },
    afterLoanBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "reversed"],
      default: "pending",
    },
    method: {
      type: String,
      enum: ["USSD", "Admin", "MobileMoney", "System"],
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    mobileMoneyRef: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: "",
      maxlength: [500, "Note cannot exceed 500 characters"],
    },
    reversed: {
      type: Boolean,
      default: false,
    },
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
transactionSchema.index({ member: 1, createdAt: -1 });
// transactionSchema.index({ reference: 1 });
transactionSchema.index({ groupId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ mobileMoneyRef: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
