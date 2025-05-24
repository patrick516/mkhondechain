const Member = require("../models/memberModel");
const walletPool = require("../utils/walletPool");

// GET all members
exports.getAllMembers = async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.status(200).json(members);
  } catch (error) {
    console.error("Error fetching members:", error.message);
    res.status(500).json({ error: "Failed to get members" });
  }
};

// POST /api/members
exports.addMember = async (req, res) => {
  const { firstName, surname, gender, phone, ethAddress } = req.body;

  if (!firstName || !surname || !phone) {
    return res
      .status(400)
      .json({ error: "First name, surname, and phone are required" });
  }

  try {
    // Auto-assign from pool if ethAddress not provided
    const used = await Member.find().distinct("ethAddress");
    const available = walletPool.find((addr) => !used.includes(addr));

    if (!ethAddress && !available) {
      return res.status(400).json({ error: "No wallet address available." });
    }

    const newMember = await Member.create({
      firstName,
      surname,
      gender,
      phone,
      ethAddress: ethAddress || available,
    });

    res.status(201).json(newMember);
  } catch (error) {
    console.error("Error adding member:", error.message);
    res.status(500).json({ error: "Failed to add member" });
  }
};
