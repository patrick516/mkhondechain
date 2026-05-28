// ─────────────────────────────────────────────────────────────
// Auth Routes
// POST /api/auth/login  → login and get token
// GET  /api/auth/me     → get current admin info (protected)
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

// Public — no auth needed
router.post("/login", authController.login);

// Protected — requires valid JWT
router.get("/me", auth, authController.me);

module.exports = router;
