// ─────────────────────────────────────────────────────────────
// Auth Middleware
// Verifies JWT token on protected routes.
// Attach to any route that should require login.
//
// Usage in routes:
//   const auth = require("../middleware/auth");
//   router.get("/protected", auth, controller.method);
// ─────────────────────────────────────────────────────────────

const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Expect: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Access denied. Please log in to continue.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // attach admin info to request
    next();
  } catch (err) {
    return res.status(403).json({
      error: "Session expired or invalid. Please log in again.",
    });
  }
};
