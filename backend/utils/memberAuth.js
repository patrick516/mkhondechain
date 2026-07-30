// Member auth helper.
// Prisma models carry no methods (unlike Mongoose documents), so
// the logic that used to live on Member.prototype.comparePin now
// lives here instead. Behavior is unchanged.
// ─────────────────────────────────────────────────────────────

const bcrypt = require("bcrypt");

async function comparePin(plainPin, pinHash) {
  return bcrypt.compare(plainPin, pinHash);
}

module.exports = { comparePin };
