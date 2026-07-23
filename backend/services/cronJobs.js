const cron = require("node-cron");
const SystemSetting = require("../models/systemSettingModel");
const Member = require("../models/memberModel");
const Transaction = require("../models/transactionModel");
const sendSms = require("../utils/africasTalkingSms");
const { ethers } = require("ethers");
const contract = require("./contract");
const userService = require("./userService");

// ─────────────────────────────────────────────────────────────
// JOB 1: Saving Window Manager (Daily at midnight)
// ─────────────────────────────────────────────────────────────
cron.schedule("0 0 * * *", async () => {
  console.log("[Cron Job 1] Saving window check...");
  try {
    let setting = await SystemSetting.findOne();
    if (!setting) {
      setting = await SystemSetting.create({});
      console.log("[Cron Job 1] First saving window created.");
      return;
    }

    const now = new Date();
    const daysSince = Math.floor(
      (now - new Date(setting.lastOpenedAt)) / (1000 * 60 * 60 * 24),
    );

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

        await Transaction.create({
          member: saver._id,
          type: "interest",
          amount: interestAmount,
          method: "Admin",
          note: "Interest reward for saving activity",
          status: "success",
        });

        const member = await Member.findById(saver._id);
        if (member?.phone) {
          await sendSms(
            member.phone,
            `MkhondeChain: Mwapeza chiwongolero cha MK${interestAmount.toLocaleString()}!\n` +
              `You earned MK${interestAmount.toLocaleString()} interest. Zikomo!`,
          );
        }
      }
    }

    if (!setting.savingWindowOpen && daysSince >= 5) {
      setting.savingWindowOpen = true;
      setting.lastOpenedAt = now;
      await setting.save();

      const members = await Member.find({ phone: { $exists: true } });
      for (const member of members) {
        if (member?.phone) {
          await sendSms(
            member.phone,
            `MkhondeChain: Lero ndilo tsiku losungira!\n` +
              `Group saving day is OPEN today! Save now.`,
          );
        }
      }
      console.log(
        `[Cron Job 1] Window opened. ${members.length} members notified.`,
      );
    }
  } catch (err) {
    console.error("[Cron Job 1] Error:", err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// JOB 2: Loan Repayment Reminders (Daily at 8am)
// Sends reminders at 5 days, 2 days, and 1 day before due date
// ─────────────────────────────────────────────────────────────
cron.schedule("0 8 * * *", async () => {
  console.log("[Cron Job 2] Loan repayment reminder check...");

  try {
    const members = await Member.find({ phone: { $exists: true } });

    for (const member of members) {
      try {
        const address = await userService.getWalletAddressByPhone(member.phone);
        if (!address) continue;

        const [, loanAmount, loanDueDate] = await contract.getBalance(address);
        const loan = parseFloat(ethers.utils.formatEther(loanAmount)) * 1000;

        if (loan <= 0) continue; // No active loan

        const dueDate = new Date(Number(loanDueDate) * 1000);
        const now = new Date();
        const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        // Send reminder at 5, 2, and 1 day before due date
        if (daysLeft === 5) {
          await sendSms(
            member.phone,
            `MkhondeChain: ${member.firstName}, ngongole yanu ya MK${Math.floor(loan).toLocaleString()} ibwere mu masiku 5.\n` +
              `Reminder: Your loan of MK${Math.floor(loan).toLocaleString()} is due in 5 days (${dueDate.toDateString()}).`,
          );
          console.log(
            `[Cron Job 2] 5-day reminder sent to ${member.firstName}`,
          );
        } else if (daysLeft === 2) {
          await sendSms(
            member.phone,
            `MkhondeChain: ${member.firstName}, ngongole yanu ya MK${Math.floor(loan).toLocaleString()} ibwere mu masiku 2!\n` +
              `Urgent: Your loan of MK${Math.floor(loan).toLocaleString()} is due in 2 days (${dueDate.toDateString()}).`,
          );
          console.log(
            `[Cron Job 2] 2-day reminder sent to ${member.firstName}`,
          );
        } else if (daysLeft === 1) {
          await sendSms(
            member.phone,
            `MkhondeChain: ${member.firstName}, MAWA mubweze ngongole ya MK${Math.floor(loan).toLocaleString()}!\n` +
              `URGENT: Your loan of MK${Math.floor(loan).toLocaleString()} is due TOMORROW! Repay via *384*48982#.`,
          );
          console.log(
            `[Cron Job 2] 1-day reminder sent to ${member.firstName}`,
          );
        } else if (daysLeft <= 0) {
          await sendSms(
            member.phone,
            `MkhondeChain: ${member.firstName}, ngongole yanu ya MK${Math.floor(loan).toLocaleString()} yatha tsiku lake!\n` +
              `OVERDUE: Your loan of MK${Math.floor(loan).toLocaleString()} is overdue! Repay now via *384*48982#.`,
          );
          console.log(
            `[Cron Job 2] Overdue notice sent to ${member.firstName}`,
          );
        }
      } catch (memberErr) {
        console.error(
          `[Cron Job 2] Error for ${member.firstName}:`,
          memberErr.message,
        );
      }
    }

    console.log("[Cron Job 2] Repayment reminder check complete.");
  } catch (err) {
    console.error("[Cron Job 2] Error:", err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// JOB 3: Inactive Member Warning & Cleanup (Daily at 1am)
// ─────────────────────────────────────────────────────────────
cron.schedule("0 1 * * *", async () => {
  console.log("[Cron Job 3] Inactive member check...");
  try {
    const members = await Member.find();

    const topSaverAgg = await Transaction.aggregate([
      { $match: { type: "save" } },
      { $group: { _id: "$member", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]);
    const requiredAmount = Math.ceil((topSaverAgg[0]?.total || 0) / 4);

    for (const member of members) {
      try {
        const lastTx = await Transaction.findOne({ member: member._id }).sort({
          createdAt: -1,
        });

        const lastActive = new Date(lastTx?.createdAt || member.createdAt);
        const daysInactive = Math.floor(
          (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysInactive === 25 && member?.phone) {
          await sendSms(
            member.phone,
            `MkhondeChain: ${member.firstName}, simugwira ntchito kwa masiku 25.\n` +
              `You have been inactive for 25 days. Save at least MK${requiredAmount.toLocaleString()} within 5 days.`,
          );
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

          const outstandingLoan = (borrowed?.total || 0) - (repaid?.total || 0);
          const totalSavings = saved?.total || 0;

          if (outstandingLoan === 0 && totalSavings === 0) {
            await Member.findByIdAndDelete(member._id);
            await Transaction.deleteMany({ member: member._id });
            console.log(
              `[Cron Job 3] Removed ${member.firstName} — inactive, zero balance.`,
            );
          }
        }
      } catch (memberErr) {
        console.error(
          `[Cron Job 3] Error for ${member.firstName}:`,
          memberErr.message,
        );
      }
    }
    console.log("[Cron Job 3] Inactive check complete.");
  } catch (err) {
    console.error("[Cron Job 3] Error:", err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// JOB 4: Audit Transparency Day SMS (28th of every month)
// ─────────────────────────────────────────────────────────────
cron.schedule("0 10 28 * *", async () => {
  console.log("[Cron Job 4] Audit Day SMS...");
  try {
    const members = await Member.find({ phone: { $exists: true } });
    for (const member of members) {
      if (!member?.phone) continue;
      await sendSms(
        member.phone,
        `MkhondeChain: Lero ndilo tsiku la Audit!\n` +
          `Today is Audit Day. Visit your group leader to verify your savings & loan record.`,
      );
    }
    console.log(`[Cron Job 4] Audit SMS sent to ${members.length} members.`);
  } catch (err) {
    console.error("[Cron Job 4] Error:", err.message);
  }
});
