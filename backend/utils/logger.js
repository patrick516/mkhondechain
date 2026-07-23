// ─────────────────────────────────────────────────────────────
// Security Logger
// Structured logging for audit trails and security forensics.
// ─────────────────────────────────────────────────────────────

const winston = require("winston");
const path = require("path");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "mkhondechain" },
  transports: [
    // Security events
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/security.log"),
      level: "warn",
    }),
    // All events
    new winston.transports.File({
      filename: path.join(__dirname, "../../logs/combined.log"),
    }),
  ],
});

// Console in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

// Security event helpers
logger.security = {
  loginSuccess: (admin, ip) =>
    logger.info("LOGIN_SUCCESS", {
      admin: admin.username,
      adminId: admin._id,
      ip,
    }),
  loginFailed: (username, ip, reason) =>
    logger.warn("LOGIN_FAILED", { username, ip, reason }),
  loginLocked: (username, ip) => logger.warn("LOGIN_LOCKED", { username, ip }),
  ussdTransaction: (phone, type, amount, ip, reference) =>
    logger.info("USSD_TRANSACTION", { phone, type, amount, ip, reference }),
  ussdFailed: (phone, type, amount, ip, reason) =>
    logger.warn("USSD_FAILED", { phone, type, amount, ip, reason }),
  adminAction: (admin, action, target, details) =>
    logger.info("ADMIN_ACTION", {
      admin: admin.username,
      action,
      target,
      details,
    }),
  unauthorizedAccess: (ip, path, token) =>
    logger.warn("UNAUTHORIZED_ACCESS", {
      ip,
      path,
      token: token ? "present" : "missing",
    }),
};

module.exports = logger;
