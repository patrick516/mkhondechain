const Member = require("../models/memberModel");
exports.getDashboardSummary = async (req, res) => {
  try {
    console.log("getDashboardSummary() called");

    // Count total members
    const totalMembers = await Member.countDocuments();
    console.log("Total members:", totalMembers);

    // Run aggregation
    const aggregate = await Member.aggregate([
      {
        $match: {
          totalSaved: { $type: "number" }, // only sum numeric values
        },
      },
      {
        $group: {
          _id: null,
          totalSaved: { $sum: "$totalSaved" },
          totalBorrowed: { $sum: "$totalBorrowed" },
        },
      },
    ]);

    console.log(" Aggregation result:", aggregate);

    // Handle empty aggregation result
    const totals =
      aggregate.length > 0 ? aggregate[0] : { totalSaved: 0, totalBorrowed: 0 };

    const totalOwing = totals.totalBorrowed;

    console.log(" Dashboard stats:", {
      totalSavings: totals.totalSaved,
      totalBorrowed: totals.totalBorrowed,
      totalOwing,
      totalMembers,
    });
    console.log("✔️ Aggregated totals:", totals);

    return res.status(200).json({
      totalSavings: totals.totalSaved,
      totalBorrowed: totals.totalBorrowed,
      totalOwing,
      totalMembers,
    });
  } catch (err) {
    console.error("Error in dashboard summary:", err.message);
    return res.status(500).json({ error: "Failed to load dashboard stats" });
  }
};
