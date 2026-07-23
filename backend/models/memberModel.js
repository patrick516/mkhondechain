// ─────────────────────────────────────────────────────────────
// Member Model
// Represents a savings group member.
// PIN is hashed with bcrypt — NEVER store plaintext.
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const memberSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    surname: {
      type: String,
      required: [true, "Surname is required"],
      trim: true,
      maxlength: [50, "Surname cannot exceed 50 characters"],
    },
    gender: {
      type: String,
      enum: {
        values: ["Male", "Female", "Other"],
        message: "Gender must be Male, Female, or Other",
      },
      required: [true, "Gender is required"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      match: [/^\+265\d{9}$/, "Phone must be in format +265XXXXXXXXX"],
    },
    pinHash: {
      type: String,
      required: [true, "PIN hash is required"],
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "Group membership is required"],
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },
    loanBalance: {
      type: Number,
      default: 0,
      min: [0, "Loan balance cannot be negative"],
    },
    totalSaved: {
      type: Number,
      default: 0,
    },
    totalBorrowed: {
      type: Number,
      default: 0,
    },
    totalRepaid: {
      type: Number,
      default: 0,
    },
    savingsCount: {
      type: Number,
      default: 0,
    },
    borrowCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "left"],
      default: "active",
    },
    lastActivity: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
// memberSchema.index({ phone: 1 });
memberSchema.index({ groupId: 1 });
memberSchema.index({ status: 1 });
memberSchema.index({ phone: 1, status: 1 });

// Compare PIN (for USSD authentication)
memberSchema.methods.comparePin = async function (plainPin) {
  return bcrypt.compare(plainPin, this.pinHash);
};

// Update last activity timestamp
memberSchema.methods.updateActivity = async function () {
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model("Member", memberSchema);
