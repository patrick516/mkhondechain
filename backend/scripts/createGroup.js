// ─────────────────────────────────────────────────────────────
// Create Group Script
// Creates a savings group and optionally assigns an admin.
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");
const readline = require("readline");
require("dotenv").config();

const Group = require("../models/Group");
const Admin = require("../models/Admin");
const SystemSetting = require("../models/systemSettingModel");
const logger = require("../utils/logger");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function createGroup() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("CREATE_GROUP_CONNECTED");

    const name = await ask("Enter group name: ");
    const location = await ask("Enter group location (village/district): ");
    const leaderId = await ask(
      "Enter admin ID for group leader (or leave blank): ",
    );

    if (!name || name.trim().length < 2) {
      console.error(" Group name must be at least 2 characters.");
      process.exit(1);
    }

    let assignedLeader = null;
    if (leaderId && leaderId.trim()) {
      const admin = await Admin.findById(leaderId.trim());
      if (!admin) {
        console.error(" Admin not found. Create the admin first.");
        process.exit(1);
      }
      assignedLeader = admin._id;
    }

    const group = await Group.create({
      name: name.trim(),
      location: location.trim(),
      leader: assignedLeader,
    });

    // Auto-create system settings for this group
    await SystemSetting.create({ groupId: group._id });

    console.log(`\n Group created successfully!`);
    console.log(`   ID:       ${group._id}`);
    console.log(`   Name:     ${group.name}`);
    console.log(`   Location: ${group.location}`);
    if (assignedLeader) {
      console.log(`   Leader:   ${assignedLeader}`);
    }
    console.log(`\n Use this ID when creating members and admins.`);

    logger.info("GROUP_CREATED", {
      groupId: group._id,
      name: group.name,
      leader: assignedLeader,
    });
  } catch (err) {
    if (err.code === 11000) {
      console.error(" A group with this name already exists.");
    } else {
      console.error(" Error creating group:", err.message);
      logger.error("CREATE_GROUP_ERROR", { error: err.message });
    }
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createGroup();
