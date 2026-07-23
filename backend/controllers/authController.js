// ─────────────────────────────────────────────────────────────
// Auth Controller
// Secure admin login with rate limiting, lockout, and audit logging.
// ─────────────────────────────────────────────────────────────

const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const logger = require("../utils/logger");
const { loginSchema } = require("../utils/validators");

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
exports.login = async (req, res) => {
  // Validate input
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { username, password } = value;
  const clientIp = req.ip || req.connection.remoteAddress;

  try {
    const admin = await Admin.findOne({
      username: username.toLowerCase().trim(),
    });

    // Always run bcrypt to prevent timing attacks
    const dummyHash = "$2b$12$abcdefghijklmnopqrstuvwxycdefghijklmnopqrstu";
    const hashToCompare = admin ? admin.passwordHash : dummyHash;
    const isMatch = await require("bcrypt").compare(password, hashToCompare);

    // Check if account is locked
    if (admin && admin.lockUntil && admin.lockUntil > Date.now()) {
      logger.security.loginLocked(admin.username, clientIp);
      return res.status(423).json({
        error: "Account locked. Please try again later or contact support.",
      });
    }

    if (!admin || !isMatch) {
      if (admin) {
        await admin.incLoginAttempts();
      }
      logger.security.loginFailed(username, clientIp, "Invalid credentials");
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Reset login attempts on success
    await admin.resetLoginAttempts();

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT
    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        groupId: admin.groupId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h", algorithm: "HS256" },
    );

    logger.security.loginSuccess(admin, clientIp);

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
        groupId: admin.groupId,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (err) {
    logger.error("LOGIN_ERROR", { error: err.message, ip: clientIp });
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

/**
 * GET /api/auth/me
 * Returns current admin info
 */
exports.me = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-passwordHash");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.status(200).json(admin);
  } catch (err) {
    logger.error("ME_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch admin info" });
  }
};
