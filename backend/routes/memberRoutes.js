const express = require("express");
const router = express.Router();
const { getAllMembers, addMember } = require("../controllers/memberController");

router.get("/", getAllMembers);
router.post("/", addMember);

module.exports = router;
