const jwt = require("jsonwebtoken");
const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");
const { loginSchema } = require("../utils/validators");
const {
  comparePassword,
  incLoginAttempts,
  resetLoginAttempts,
} = require("../utils/adminAuth");

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
    const admin = await prisma.admin.findUnique({
      where: { username: username.toLowerCase().trim() },
    });

    // Always run bcrypt to prevent timing attacks
    const dummyHash = "$2b$12$abcdefghijklmnopqrstuvwxycdefghijklmnopqrstu";
    const hashToCompare = admin ? admin.passwordHash : dummyHash;
    const isMatch = await comparePassword(password, hashToCompare);

    // Check if account is locked
    if (admin && admin.lockUntil && admin.lockUntil > Date.now()) {
      logger.security.loginLocked(admin.username, clientIp);
      return res.status(423).json({
        error: "Account locked. Please try again later or contact support.",
      });
    }

    if (!admin || !isMatch) {
      if (admin) {
        await incLoginAttempts(prisma, admin);
      }
      logger.security.loginFailed(username, clientIp, "Invalid credentials");
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Reset login attempts on success
    await resetLoginAttempts(prisma, admin);

    // Update last login
    admin.lastLogin = new Date();
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: admin.lastLogin },
    });

    const token = jwt.sign(
      {
        id: admin.id,
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

exports.me = async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id },
      omit: { passwordHash: true },
    });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.status(200).json(admin);
  } catch (err) {
    logger.error("ME_ERROR", { error: err.message });
    res.status(500).json({ error: "Failed to fetch admin info" });
  }
};
