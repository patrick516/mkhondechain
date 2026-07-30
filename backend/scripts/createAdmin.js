// Create Admin Script
// Creates an admin account with secure password hashing.
// Password is hashed here directly with bcrypt — Prisma models
// have no pre-save hooks (unlike the old Mongoose model), so this
// logic that used to live in Admin.js now lives in the script
// (and in adminAuth.js / authController.js for login-time checks).
// ─────────────────────────────────────────────────────────────

const bcrypt = require("bcrypt");
const readline = require("readline");
require("dotenv").config();

const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");

const SALT_ROUNDS = 12;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function createAdmin() {
  try {
    logger.info("CREATE_ADMIN_CONNECTED");

    // Check if any admin already exists
    const existing = await prisma.admin.count();
    if (existing > 0) {
      console.log(" An admin account already exists.");
      const overwrite = await ask(
        "Do you want to create another one? (yes/no): ",
      );
      if (overwrite.trim().toLowerCase() !== "yes") {
        console.log("Cancelled.");
        process.exit(0);
      }
    }

    const username = await ask("Enter admin username: ");
    const fullName = await ask("Enter full name: ");
    const password = await ask(
      "Enter admin password (min 8 chars, mixed case + number): ",
    );

    // Optional: assign to group
    const groupId = await ask(
      "Enter group ID (or leave blank for superadmin): ",
    );

    // Validation
    if (!username || username.trim().length < 3) {
      console.error(" Username must be at least 3 characters.");
      process.exit(1);
    }

    if (!fullName || fullName.trim().length < 2) {
      console.error(" Full name is required.");
      process.exit(1);
    }

    if (!password || password.trim().length < 8) {
      console.error(" Password must be at least 8 characters.");
      process.exit(1);
    }

    // Password strength check
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasUpper || !hasLower || !hasNumber) {
      console.error(
        " Password must contain uppercase, lowercase, and a number.",
      );
      process.exit(1);
    }

    // Validate group if provided
    let assignedGroupId = null;
    let role = "superadmin";

    if (groupId && groupId.trim()) {
      const group = await prisma.group.findUnique({
        where: { id: groupId.trim() },
      });
      if (!group) {
        console.error(" Group not found. Please create the group first.");
        process.exit(1);
      }
      assignedGroupId = group.id;
      role = "admin";
    }

    // Hash password manually — no pre-save hook in Prisma
    const passwordHash = await bcrypt.hash(password.trim(), SALT_ROUNDS);

    const admin = await prisma.admin.create({
      data: {
        username: username.trim().toLowerCase(),
        passwordHash,
        fullName: fullName.trim(),
        role,
        groupId: assignedGroupId,
      },
    });

    console.log(`\n Admin created successfully!`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Full Name: ${admin.fullName}`);
    console.log(`   Role:     ${admin.role}`);
    if (assignedGroupId) {
      console.log(`   Group:    ${assignedGroupId}`);
    }
    console.log(`\n You can now log in at: POST /api/auth/login`);

    logger.info("ADMIN_CREATED", {
      username: admin.username,
      role: admin.role,
    });
  } catch (err) {
    if (err.code === "P2002") {
      console.error(" That username already exists. Choose a different one.");
    } else {
      console.error(" Error creating admin:", err.message);
      logger.error("CREATE_ADMIN_ERROR", { error: err.message });
    }
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

createAdmin();

// Enter admin username: Pkulinji
// Enter admin password :Patricks123
