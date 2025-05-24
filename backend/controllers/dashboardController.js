const Member = require("../models/memberModel");

exports.getDashboardSummary = async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();

    // For now we return mock values — you can improve them later
    res.json({
      totalSavings: 0,
      totalBorrowed: 0,
      totalOwing: 0,
      totalMembers,
    });
  } catch (err) {
    console.error("Error in dashboard summary:", err.message);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
};
