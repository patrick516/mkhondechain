const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");
require("dotenv").config();

const Admin = require("../models/Admin");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(" Connected to MongoDB\n");

    // Check if any admin already exists
    const existing = await Admin.countDocuments();
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
    const password = await ask("Enter admin password (min 8 characters): ");

    if (!username || username.trim().length < 3) {
      console.error(" Username must be at least 3 characters.");
      process.exit(1);
    }

    if (!password || password.trim().length < 8) {
      console.error(" Password must be at least 8 characters.");
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password.trim(), 12);

    const admin = await Admin.create({
      username: username.trim().toLowerCase(),
      passwordHash,
      role: "admin",
    });

    console.log(`\n Admin created successfully!`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role:     ${admin.role}`);
    console.log(`\n You can now log in at: POST /api/auth/login`);
  } catch (err) {
    if (err.code === 11000) {
      console.error(" That username already exists. Choose a different one.");
    } else {
      console.error(" Error creating admin:", err.message);
    }
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createAdmin();

// Enter admin username: Pkulinji
// Enter admin password :admin1234
