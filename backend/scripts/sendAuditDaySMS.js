// scripts/sendAuditDaySMS.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Member = require("../models/memberModel");
const sendSms = require("../utils/africasTalkingSms");

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  console.log("Sending Audit Day SMS to all members...");

  const message = `MkhondeChain Notice:\nToday is Audit Transparency Day.\nVisit your group leader to view your records.\nSmartphone? Tap: https://mkhondechain.app/audit-log`;

  try {
    const members = await Member.find({ phone: { $exists: true } });

    for (const member of members) {
      try {
        await sendSms(member.phone, message);
        console.log(`SMS sent to ${member.phone}`);
      } catch (err) {
        console.error(`Failed to send to ${member.phone}:`, err.message);
      }
    }

    console.log("All Audit Day SMS sent.");
  } catch (error) {
    console.error("Error sending audit messages:", error.message);
  } finally {
    mongoose.connection.close();
  }
}

run();
