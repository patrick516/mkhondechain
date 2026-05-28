// ─────────────────────────────────────────────────────────────
// Auth Controller
// Handles admin login and returns a JWT token.
// ─────────────────────────────────────────────────────────────

const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Find admin by username
    const admin = await Admin.findOne({
      username: username.toLowerCase().trim(),
    });

    if (!admin) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Update last login time
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token — expires in 8 hours
    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      admin: {
        username: admin.username,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

/**
 * GET /api/auth/me
 * Returns the currently logged in admin's info
 * Requires auth middleware
 */
exports.me = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-passwordHash");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.status(200).json(admin);
  } catch (err) {
    console.error("Me error:", err.message);
    res.status(500).json({ error: "Failed to fetch admin info" });
  }
};
