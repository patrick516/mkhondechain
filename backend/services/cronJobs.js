const cron = require("node-cron");
const SystemSetting = require("../models/systemSettingModel");
const Member = require("../models/memberModel");
const Transaction = require("../models/transactionModel");
const sendSMS = require("../utils/africasTalkingSms");

// ─────────────────────────────
// JOB 1: Manage Saving Window (Every 5 Days)
// ─────────────────────────────

cron.schedule("0 0 * * *", async () => {
  console.log("[Saving Window Job] Checking...");

  let setting = await SystemSetting.findOne();
  if (!setting) {
    setting = await SystemSetting.create({
      savingWindowOpen: true,
      lastOpenedAt: new Date(),
    });
    console.log(" First saving window opened");
    return;
  }

  const now = new Date();
  const lastOpened = new Date(setting.lastOpenedAt);
  const daysSince = Math.floor((now - lastOpened) / (1000 * 60 * 60 * 24));

  // 1. CLOSE window if it's been open for 1 day
  if (setting.savingWindowOpen && daysSince >= 1) {
    setting.savingWindowOpen = false;
    await setting.save();
    console.log(" Saving window closed");

    // Reward interest to active savers
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 1); // last 24h

    const activeSavers = await Transaction.aggregate([
      {
        $match: {
          type: "save",
          createdAt: { $gte: thresholdDate },
        },
      },
      {
        $group: {
          _id: "$member",
          totalSaved: { $sum: "$amount" },
        },
      },
    ]);

    for (const saver of activeSavers) {
      const interestAmount = Math.floor(saver.totalSaved * 0.05); // 5% interest
      if (interestAmount <= 0) continue;

      await Transaction.create({
        member: saver._id,
        type: "interest",
        amount: interestAmount,
        method: "System",
        note: "Interest reward for saving activity",
      });

      const member = await Member.findById(saver._id);
      await sendSMS(
        member.phone,
        `MkhondeChain: You’ve earned MK ${interestAmount.toLocaleString()} as a saving reward!`
      );

      console.log(
        `Interest rewarded to ${member.firstName}: MK ${interestAmount}`
      );
    }
    if (activeSavers.length === 0) {
      console.log("No savers qualified for interest this cycle.");
    }
  }

  //  2. OPEN new window if it’s been 5 days
  if (!setting.savingWindowOpen && daysSince >= 5) {
    setting.savingWindowOpen = true;
    setting.lastOpenedAt = now;
    await setting.save();
    console.log("Saving window opened");

    // Notify all members
    const members = await Member.find();
    for (const member of members) {
      if (member?.phone) {
        await sendSMS(
          member.phone,
          `MkhondeChain: Group saving day is OPEN today! Save now to stay active.`
        );
      }
    }

    console.log("Members notified about saving window");
  } else {
    console.log("No changes to saving window today");
  }
});

// ─────────────────────────────
// JOB 2: Auto-clean Inactive Members (Daily)
// ─────────────────────────────
cron.schedule("0 1 * * *", async () => {
  console.log("[Cleanup Job] Checking inactive members...");

  const members = await Member.find();

  const topSaverAgg = await Transaction.aggregate([
    { $match: { type: "save" } },
    { $group: { _id: "$member", total: { $sum: "$amount" } } },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ]);
  const topSaved = topSaverAgg[0]?.total || 0;
  const requiredAmount = Math.ceil(topSaved / 4);

  for (const member of members) {
    const lastTx = await Transaction.findOne({ member: member._id }).sort({
      createdAt: -1,
    });

    const lastActive = new Date(lastTx?.createdAt || member.createdAt);
    const daysInactive = Math.floor(
      (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysInactive === 25) {
      if (member?.phone) {
        await sendSMS(
          member.phone,
          `Hi ${member.firstName}, you’ve been inactive for 25 days. Save at least MK ${requiredAmount} within 5 days to remain in MkhondeChain.`
        );
      }
      console.log(`Warning sent to ${member.firstName}`);
    }

    if (daysInactive >= 30) {
      const [borrowed] = await Transaction.aggregate([
        { $match: { member: member._id, type: "borrow" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const [repaid] = await Transaction.aggregate([
        { $match: { member: member._id, type: "repay" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const [saved] = await Transaction.aggregate([
        { $match: { member: member._id, type: "save" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const loan = (borrowed?.total || 0) - (repaid?.total || 0);
      const savings = saved?.total || 0;

      if (loan === 0 && savings === 0) {
        await Member.findByIdAndDelete(member._id);
        await Transaction.deleteMany({ member: member._id });
        console.log(`Deleted ${member.firstName} (inactive 30+ days)`);
      }
    }
  }
});
