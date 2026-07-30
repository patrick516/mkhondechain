// ─────────────────────────────────────────────────────────────
// File: backend/utils/adminAuth.js
// ─────────────────────────────────────────────────────────────
// Admin auth helpers.
// Prisma models carry no methods (unlike Mongoose documents), so
// the logic that used to live on Admin.prototype.comparePassword,
// incLoginAttempts, and resetLoginAttempts now lives here instead.
// Behavior is unchanged from the original Mongoose implementation.
// ─────────────────────────────────────────────────────────────

const bcrypt = require("bcrypt");

const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 2 * 60 * 60 * 1000; // 2 hours

async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Increments loginAttempts, applying/resetting lockout as needed.
 * Mirrors the original Mongoose instance method's behavior exactly.
 */
async function incLoginAttempts(prisma, admin) {
  const now = new Date();

  // If a previous lock has expired, reset attempts instead of incrementing
  if (admin.lockUntil && admin.lockUntil < now) {
    return prisma.admin.update({
      where: { id: admin.id },
      data: { loginAttempts: 1, lockUntil: null },
    });
  }

  const isLocked = admin.lockUntil && admin.lockUntil > now;
  const nextAttempts = admin.loginAttempts + 1;

  const data = { loginAttempts: nextAttempts };
  if (nextAttempts >= MAX_ATTEMPTS && !isLocked) {
    data.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
  }

  return prisma.admin.update({
    where: { id: admin.id },
    data,
  });
}

async function resetLoginAttempts(prisma, admin) {
  return prisma.admin.update({
    where: { id: admin.id },
    data: { loginAttempts: 0, lockUntil: null },
  });
}

module.exports = {
  comparePassword,
  incLoginAttempts,
  resetLoginAttempts,
  MAX_ATTEMPTS,
  LOCK_TIME_MS,
};
