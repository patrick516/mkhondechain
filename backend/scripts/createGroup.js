// Create Group Script
// Creates a savings group with a required leader (existing Admin).
// ─────────────────────────────────────────────────────────────

const readline = require("readline");
require("dotenv").config();

const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function createGroup() {
  try {
    logger.info("CREATE_GROUP_CONNECTED");

    const name = await ask("Enter group name: ");
    const location = await ask("Enter group location (village/district): ");
    const leaderId = await ask("Enter admin ID for group leader: ");

    if (!name || name.trim().length < 2) {
      console.error(" Group name must be at least 2 characters.");
      process.exit(1);
    }

    if (!leaderId || !leaderId.trim()) {
      console.error(
        " A leader admin ID is required. Create the admin first with createAdmin.js.",
      );
      process.exit(1);
    }

    const admin = await prisma.admin.findUnique({
      where: { id: leaderId.trim() },
    });
    if (!admin) {
      console.error(" Admin not found. Create the admin first.");
      process.exit(1);
    }

    // Create the group, then auto-create its settings record —
    // both succeed together or neither does.
    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        location: location.trim(),
        leaderId: admin.id,
      },
    });

    await prisma.systemSetting.create({
      data: { groupId: group.id },
    });

    // Point the leader's own groupId back at this new group
    await prisma.admin.update({
      where: { id: admin.id },
      data: { groupId: group.id },
    });

    console.log(`\n Group created successfully!`);
    console.log(`   ID:       ${group.id}`);
    console.log(`   Name:     ${group.name}`);
    console.log(`   Location: ${group.location}`);
    console.log(`   Leader:   ${admin.id} (${admin.username})`);
    console.log(`\n Use this ID when creating members.`);

    logger.info("GROUP_CREATED", {
      groupId: group.id,
      name: group.name,
      leader: admin.id,
    });
  } catch (err) {
    if (err.code === "P2002") {
      console.error(" A group with this name already exists.");
    } else {
      console.error(" Error creating group:", err.message);
      logger.error("CREATE_GROUP_ERROR", { error: err.message });
    }
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createGroup();
