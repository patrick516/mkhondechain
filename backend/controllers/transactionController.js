const Transaction = require("../models/transactionModel");
const Member = require("../models/memberModel");

// GET /api/transactions/member/:memberId
exports.getMemberTransactions = async (req, res) => {
  const { memberId } = req.params;

  try {
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const transactions = await Transaction.find({ member: memberId }).sort({
      createdAt: 1,
    });

    let totalSavings = 0;
    let totalBorrowed = 0;
    let totalRepaid = 0;
    let totalInterest = 0;

    const detailed = transactions.map((tx) => {
      if (tx.type === "save") totalSavings += tx.amount;
      if (tx.type === "borrow") {
        totalBorrowed += tx.amount;
        totalInterest += tx.interest || 0;
      }
      if (tx.type === "repay") totalRepaid += tx.amount;
      if (tx.type === "interest") totalInterest += tx.amount;

      return {
        date: tx.createdAt,
        type: tx.type,
        amount: tx.amount,
        repaid: tx.repaid || 0,
        method: tx.method,
        note: tx.note,
        interest: tx.interest || 0,
        totalOnDay: tx.amount + (tx.interest || 0),
      };
    });

    const totalOwing = totalBorrowed - totalRepaid;
    const gender = member.gender?.toLowerCase() === "female" ? "she" : "he";

    let conclusion = "";
    const interestRatio = totalInterest / (totalSavings || 1);

    if (interestRatio >= 0.5) {
      conclusion = `${
        gender[0].toUpperCase() + gender.slice(1)
      } is an active participant and has earned substantial interest. Encourage continued savings.`;
    } else if (interestRatio >= 0.2) {
      conclusion = `${
        gender[0].toUpperCase() + gender.slice(1)
      } is saving steadily and benefits from interest rewards.`;
    } else {
      conclusion = `${
        gender[0].toUpperCase() + gender.slice(1)
      } is encouraged to increase savings to benefit more from interest and grow wealth.`;
    }

    return res.status(200).json({
      member: {
        fullName: `${member.firstName} ${member.surname}`,
        gender: member.gender,
        phone: member.phone,
        ethAddress: member.ethAddress,
        joined: member.createdAt,
      },
      transactions: detailed,
      summary: {
        totalBorrowed,
        totalRepaid,
        totalOwing,
        totalSavings,
        totalInterest,
        totalWithInterest: totalSavings + totalInterest,
        conclusion,
      },
    });
  } catch (error) {
    console.error("Get member transactions failed:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to fetch member transactions" });
  }
};

// GET /api/transactions/summary
exports.getTransactionSummary = async (req, res) => {
  try {
    const members = await Member.find();

    const summary = await Promise.all(
      members.map(async (member) => {
        const transactions = await Transaction.find({ member: member._id });

        const totalSavings = transactions
          .filter((t) => t.type === "save")
          .reduce((sum, t) => sum + t.amount, 0);

        const totalBorrowed = transactions
          .filter((t) => t.type === "borrow")
          .reduce((sum, t) => sum + t.amount, 0);

        const totalRepaid = transactions
          .filter((t) => t.type === "repay")
          .reduce((sum, t) => sum + t.amount, 0);

        const totalInterest = transactions
          .filter((t) => t.interest > 0)
          .reduce((sum, t) => sum + t.interest, 0);

        const latestBorrow =
          transactions.filter((t) => t.type === "borrow").slice(-1)[0]
            ?.amount || 0;

        const latestRepay =
          transactions.filter((t) => t.type === "repay").slice(-1)[0]?.amount ||
          0;

        const debtor = totalBorrowed - totalRepaid;
        const paidStatus =
          debtor === 0 ? "Yes" : totalRepaid === 0 ? "No" : "Partial";

        return {
          _id: member._id,
          firstName: member.firstName,
          surname: member.surname,
          borrowed: latestBorrow,
          repaid: latestRepay,
          paidStatus,
          debtor,
          interest: totalInterest,
          totalAmount: totalSavings + totalInterest,
        };
      })
    );

    res.status(200).json(summary);
  } catch (err) {
    console.error("Failed to load summary:", err.message);
    res.status(500).json({ error: "Failed to load summary" });
  }
};

// GET /api/transactions/total-savings

exports.getTotalSavings = async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: "save" });

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);

    res.status(200).json({ totalSavings: total });
  } catch (err) {
    console.error("Failed to get total savings:", err.message);
    res.status(500).json({ error: "Failed to get total savings" });
  }
};

exports.getTotalBorrowed = async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: "borrow" });
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    res.status(200).json({ totalBorrowed: total });
  } catch (err) {
    console.error("Error getting total borrowed:", err.message);
    res.status(500).json({ error: "Failed to get total borrowed" });
  }
};

exports.getTotalOutstanding = async (req, res) => {
  try {
    const members = await Member.find();

    let totalOwing = 0;

    for (const member of members) {
      const transactions = await Transaction.find({ member: member._id });
      const borrowed = transactions
        .filter((t) => t.type === "borrow")
        .reduce((sum, t) => sum + t.amount, 0);
      const repaid = transactions
        .filter((t) => t.type === "repay")
        .reduce((sum, t) => sum + t.amount, 0);
      totalOwing += borrowed - repaid;
    }

    res.status(200).json({ totalOwing });
  } catch (err) {
    console.error("Error getting total owing:", err.message);
    res.status(500).json({ error: "Failed to get total owing" });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const recent = await Transaction.find().sort({ createdAt: -1 }).limit(10);

    const memberMap = {}; // Optional: Cache for member lookup

    const formatted = await Promise.all(
      recent.map(async (tx) => {
        const memberId = tx.member.toString();

        if (!memberMap[memberId]) {
          const member = await Member.findById(tx.member);
          memberMap[memberId] = member;
        }

        return {
          member: `${memberMap[memberId].firstName} ${memberMap[memberId].surname}`,
          action:
            tx.type === "borrow"
              ? "Borrowed"
              : tx.type === "save"
              ? "Saved"
              : tx.type === "repay"
              ? "Repaid"
              : tx.type === "interest"
              ? "Interest"
              : "Unknown",
          amount: `MK ${tx.amount.toLocaleString()}`,
          status: tx.status || "Success",
          date: tx.createdAt,
        };
      })
    );

    res.json(formatted);
  } catch (err) {
    console.error("Failed to fetch recent activity:", err.message);
    res.status(500).json({ error: "Failed to load activity" });
  }
};

exports.getLoanRequests = async (req, res) => {
  try {
    const transactions = await Transaction.find({ type: "borrow" })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("member");

    const formatted = transactions.map((tx) => ({
      member: `${tx.member.firstName} ${tx.member.surname}`,
      amount: `MK ${tx.amount.toLocaleString()}`,
      date: new Date(tx.createdAt).toISOString().slice(0, 10),
      status: tx.status || "Pending",
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("Error fetching loan requests:", err.message);
    res.status(500).json({ error: "Failed to fetch loan requests" });
  }
};
