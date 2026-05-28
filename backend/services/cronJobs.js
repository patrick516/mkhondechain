// ─────────────────────────────────────────────────────────────
// Cron Jobs — MkhondeChain
// Runs automatically in the background on schedule.
//
// Job 1: Saving Window Manager  — runs daily at midnight
// Job 2: Inactive Member Check  — runs daily at 1am
// Job 3: Audit Transparency Day — runs on 28th of every month
// ─────────────────────────────────────────────────────────────

const cron = require("node-cron");
const SystemSetting = require("../models/systemSettingModel");
const Member = require("../models/memberModel");
const Transaction = require("../models/transactionModel");
const sendSms = require("../utils/africasTalkingSms");

// ─────────────────────────────────────────────────────────────
// JOB 1: Saving Window Manager (Daily at midnight)
// Opens and closes the saving window on a 5-day cycle.
// Rewards 5% interest to members who saved during the window.
// ─────────────────────────────────────────────────────────────

cron.schedule("0 0 * * *", async () => {
  console.log("[Cron Job 1] Saving window check running...");

  try {
    let setting = await SystemSetting.findOne();
    if (!setting) {
      setting = await SystemSetting.create({
        savingWindowOpen: true,
        lastOpenedAt: new Date(),
      });
      console.log("[Cron Job 1] First saving window created and opened.");
      return;
    }

    const now = new Date();
    const daysSince = Math.floor(
      (now - new Date(setting.lastOpenedAt)) / (1000 * 60 * 60 * 24),
    );

    // Close window after 1 day and reward interest
    if (setting.savingWindowOpen && daysSince >= 1) {
      setting.savingWindowOpen = false;
      await setting.save();
      console.log("[Cron Job 1] Saving window closed.");

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - 1);

      const activeSavers = await Transaction.aggregate([
        { $match: { type: "save", createdAt: { $gte: thresholdDate } } },
        { $group: { _id: "$member", totalSaved: { $sum: "$amount" } } },
      ]);

      for (const saver of activeSavers) {
        const interestAmount = Math.floor(saver.totalSaved * 0.05);
        if (interestAmount <= 0) continue;

        // FIX: method must match transactionModel enum
        await Transaction.create({
          member: saver._id,
          type: "interest",
          amount: interestAmount,
          method: "Admin", // System-generated, using Admin as closest enum value
          note: "Interest reward for saving activity",
          status: "success",
        });

        const member = await Member.findById(saver._id);
        if (member?.phone) {
          // Bilingual SMS
          await sendSms(
            member.phone,
            `MkhondeChain: Mwapeza chiwongolero! MK${interestAmount.toLocaleString()} yawonjezedwa.\n` +
              `You earned MK${interestAmount.toLocaleString()} interest. Zikomo!`,
          );
          console.log(
            `[Cron Job 1] Interest MK${interestAmount} sent to ${member.firstName}`,
          );
        }
      }

      if (activeSavers.length === 0) {
        console.log(
          "[Cron Job 1] No savers qualified for interest this cycle.",
        );
      }
    }

    // Open new window after 5 days
    if (!setting.savingWindowOpen && daysSince >= 5) {
      setting.savingWindowOpen = true;
      setting.lastOpenedAt = now;
      await setting.save();
      console.log("[Cron Job 1] Saving window opened.");

      const members = await Member.find({ phone: { $exists: true } });
      for (const member of members) {
        if (member?.phone) {
          // Bilingual SMS
          await sendSms(
            member.phone,
            `MkhondeChain: Lero ndilo tsiku losungira! Sungani ndalama lero.\n` +
              `Group saving day is OPEN today! Save now to stay active.`,
          );
        }
      }
      console.log(
        `[Cron Job 1] ${members.length} members notified of open window.`,
      );
    } else if (!setting.savingWindowOpen) {
      console.log("[Cron Job 1] Window still closed. No changes today.");
    }
  } catch (err) {
    console.error("[Cron Job 1] Error:", err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// JOB 2: Inactive Member Warning & Cleanup (Daily at 1am)
// Warns members inactive for 25 days.
// Removes members inactive for 30+ days with zero balance.
// ─────────────────────────────────────────────────────────────

cron.schedule("0 1 * * *", async () => {
  console.log("[Cron Job 2] Inactive member check running...");

  try {
    const members = await Member.find();

    // Find top saver to set the activity threshold
    const topSaverAgg = await Transaction.aggregate([
      { $match: { type: "save" } },
      { $group: { _id: "$member", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]);
    const topSaved = topSaverAgg[0]?.total || 0;
    const requiredAmount = Math.ceil(topSaved / 4);

    for (const member of members) {
      try {
        const lastTx = await Transaction.findOne({ member: member._id }).sort({
          createdAt: -1,
        });

        const lastActive = new Date(lastTx?.createdAt || member.createdAt);
        const daysInactive = Math.floor(
          (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Warning at 25 days
        if (daysInactive === 25 && member?.phone) {
          await sendSms(
            member.phone,
            `MkhondeChain: ${member.firstName}, simugwira ntchito kwa masiku 25.\n` +
              `You have been inactive for 25 days. Save at least MK${requiredAmount.toLocaleString()} within 5 days to remain active.`,
          );
          console.log(`[Cron Job 2] Warning sent to ${member.firstName}`);
        }

        // Cleanup at 30+ days — only if zero savings and zero loans
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

          const outstandingLoan = (borrowed?.total || 0) - (repaid?.total || 0);
          const totalSavings = saved?.total || 0;

          // Only delete if truly zero — no savings, no outstanding loan
          if (outstandingLoan === 0 && totalSavings === 0) {
            await Member.findByIdAndDelete(member._id);
            await Transaction.deleteMany({ member: member._id });
            console.log(
              `[Cron Job 2] Removed ${member.firstName} — inactive 30+ days, zero balance.`,
            );
          } else {
            console.log(
              `[Cron Job 2] ${member.firstName} inactive but has balance — not removed.`,
            );
          }
        }
      } catch (memberErr) {
        // Don't let one member error stop the whole job
        console.error(
          `[Cron Job 2] Error processing ${member.firstName}:`,
          memberErr.message,
        );
      }
    }

    console.log("[Cron Job 2] Inactive member check complete.");
  } catch (err) {
    console.error("[Cron Job 2] Error:", err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// JOB 3: Audit Transparency Day SMS (28th of every month)
// Reminds all members to verify their records with group leader.
// ─────────────────────────────────────────────────────────────

cron.schedule("0 10 28 * *", async () => {
  console.log("[Cron Job 3] Audit Transparency Day SMS running...");

  try {
    const members = await Member.find({ phone: { $exists: true } });
    let sent = 0;

    for (const member of members) {
      if (!member?.phone) continue;

      // Bilingual SMS
      await sendSms(
        member.phone,
        `MkhondeChain: Lero ndilo tsiku la Audit!\n` +
          `Today is Audit Transparency Day.\n` +
          `Pitani kwa mtsogoleri wa gulu lanu kuyonetsa ndalama zanu.\n` +
          `Visit your group leader to verify your savings & loan record.`,
      );
      sent++;
    }

    console.log(`[Cron Job 3] Audit Day SMS sent to ${sent} members.`);
  } catch (err) {
    console.error("[Cron Job 3] Error:", err.message);
  }
});
