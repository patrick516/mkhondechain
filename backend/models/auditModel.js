// ─────────────────────────────────────────────────────────────
// Audit Model
// Immutable security and compliance log.
// Every admin action and system event is recorded here.
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "LoginSuccess",
        "LoginFailed",
        "LoginLocked",
        "Logout",
        "MemberCreated",
        "MemberUpdated",
        "MemberDeleted",
        "MemberPinReset",
        "TransactionCreated",
        "TransactionApproved",
        "TransactionRejected",
        "TransactionReversed",
        "LoanDisbursed",
        "LoanRepaid",
        "SettingsUpdated",
        "BroadcastSent",
        "AdminCreated",
        "AdminUpdated",
        "UnauthorizedAccess",
        "SystemError",
      ],
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null, // null for system actions
    },
    performedByName: {
      type: String,
      default: "System",
    },
    targetMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    targetMemberPhone: {
      type: String,
      default: null,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    details: {
      type: Map,
      of: String,
      default: new Map(),
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for fast querying
auditSchema.index({ action: 1, createdAt: -1 });
auditSchema.index({ performedBy: 1, createdAt: -1 });
auditSchema.index({ groupId: 1, createdAt: -1 });
auditSchema.index({ severity: 1, createdAt: -1 });
auditSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Audit", auditSchema);
