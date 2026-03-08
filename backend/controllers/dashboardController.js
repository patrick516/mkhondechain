const Member = require("../models/memberModel");
const Transaction = require("../models/transactionModel");

exports.getDashboardSummary = async (req, res) => {
  try {
    console.log("getDashboardSummary() called");

    // Count total members
    const totalMembers = await Member.countDocuments();

    // Aggregate totalSaved and totalBorrowed from the Member model
    const aggregate = await Member.aggregate([
      {
        $match: {
          totalSaved: { $type: "number" }, // Only numeric
        },
      },
      {
        $group: {
          _id: null,
          totalSaved: { $sum: "$totalSaved" },
        },
      },
    ]);
    const totals = aggregate.length > 0 ? aggregate[0] : { totalSaved: 0 };

    // totalBorrowed and totalRepaid from Transaction model
    const borrowTx = await Transaction.find({ type: "borrow" });
    const repayTx = await Transaction.find({ type: "repay" });

    const totalBorrowed = borrowTx.reduce((sum, tx) => sum + tx.amount, 0);
    const totalRepaid = repayTx.reduce((sum, tx) => sum + tx.amount, 0);

    const totalOwing = totalBorrowed - totalRepaid;

    const stats = {
      totalSavings: totals.totalSaved,
      totalBorrowed,
      totalOwing,
      totalMembers,
    };
    console.log("Final Dashboard Summary:", stats);

    return res.status(200).json(stats);
  } catch (err) {
    console.error("Error in dashboard summary:", err.message);
    return res.status(500).json({ error: "Failed to load dashboard stats" });
  }
};
