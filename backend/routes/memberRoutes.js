// ─────────────────────────────────────────────────────────────
// Member Routes
// CRUD for savings group members.
// All routes require authentication.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const {
  getAllMembers,
  getMember,
  addMember,
  updateMember,
  deleteMember,
  resetPin,
} = require("../controllers/memberController");

// List all members (group-scoped)
router.get("/", getAllMembers);

// Get single member
router.get("/:id", getMember);

// Add new member
router.post("/", addMember);

// Update member
router.patch("/:id", updateMember);

// Soft delete member
router.delete("/:id", deleteMember);

// Reset member PIN
router.post("/:id/reset-pin", resetPin);

module.exports = router;
