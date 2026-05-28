// ─────────────────────────────────────────────────────────────
// Admin Model
// Separate from the Member/User models.
// This is for the group leader who logs into the web dashboard.
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "superadmin"],
    default: "admin",
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Compare a plain text password with the stored hash
 * @param {string} password
 * @returns {Promise<boolean>}
 */
adminSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model("Admin", adminSchema);
