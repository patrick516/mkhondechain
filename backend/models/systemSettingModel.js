// ─────────────────────────────────────────────────────────────
// System Setting Model
// Per-group configuration settings.
// Each group has exactly one settings document.
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const systemSettingSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      unique: true, // One settings doc per group
    },

    // Loan repayment period in days
    repayDays: {
      type: Number,
      default: 30,
      min: [1, "Repayment period must be at least 1 day"],
      max: [365, "Repayment period cannot exceed 365 days"],
    },

    // Interest rate on loans (percentage)
    interestRate: {
      type: Number,
      default: 10,
      min: [0, "Interest rate cannot be negative"],
      max: [100, "Interest rate cannot exceed 100%"],
    },

    // Minimum save amount
    minSaveAmount: {
      type: Number,
      default: 100,
      min: [1, "Minimum save amount must be at least 1"],
    },

    // Maximum loan as percentage of savings
    maxLoanPercent: {
      type: Number,
      default: 50,
      min: [0, "Max loan percent cannot be negative"],
      max: [100, "Max loan percent cannot exceed 100"],
    },

    // Saving time window (optional restriction)
    savingWindow: {
      enabled: { type: Boolean, default: false },
      openTime: { type: String, default: "08:00" }, // HH:MM format
      closeTime: { type: String, default: "17:00" },
    },

    // Last broadcast message
    lastBroadcastMessage: {
      type: String,
      default: "",
      maxlength: [
        320,
        "Broadcast message cannot exceed 320 characters (2 SMS)",
      ],
    },
    lastBroadcastAt: {
      type: Date,
      default: null,
    },

    // System status
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Indexes

// Helper: get settings for a group (create default if not exists)
systemSettingSchema.statics.getForGroup = async function (groupId) {
  let settings = await this.findOne({ groupId });
  if (!settings) {
    settings = await this.create({ groupId });
  }
  return settings;
};

module.exports = mongoose.model("SystemSetting", systemSettingSchema);
