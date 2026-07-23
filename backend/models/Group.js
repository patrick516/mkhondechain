// ─────────────────────────────────────────────────────────────
// Group Model
// Represents a village savings group (chilimba / Banki Mkhonde).
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    fundBalance: {
      type: Number,
      default: 0,
      min: [0, "Fund balance cannot be negative"],
    },
    maxLoanPercent: {
      type: Number,
      default: 50, // Members can borrow up to 50% of their savings
      min: [0, "Max loan percent cannot be negative"],
      max: [100, "Max loan percent cannot exceed 100"],
    },
    interestRate: {
      type: Number,
      default: 10, // 10% interest on loans
      min: [0, "Interest rate cannot be negative"],
    },
    maxRepayDays: {
      type: Number,
      default: 30,
      min: [1, "Repayment period must be at least 1 day"],
    },
    minSaveAmount: {
      type: Number,
      default: 100,
      min: [1, "Minimum save amount must be at least 1"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

groupSchema.index({ name: 1 });
groupSchema.index({ leader: 1 });
groupSchema.index({ status: 1 });

module.exports = mongoose.model("Group", groupSchema);
