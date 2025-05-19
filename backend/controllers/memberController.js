const Member = require("../models/memberModel");
const walletPool = require("../utils/walletPool");

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
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    //  Pick the next wallet from the pool (round-robin or just use index 0 for now)
    const memberCount = await Member.countDocuments();
    const walletAddress = walletPool[memberCount % walletPool.length]; // rotate through the pool

    const newMember = await Member.create({
      name,
      phone,
      ethAddress: walletAddress,
    });

    res.status(201).json(newMember);
  } catch (error) {
    console.error("Error adding member:", error.message);
    res.status(500).json({ error: "Failed to add member" });
  }
};
