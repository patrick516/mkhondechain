const mongoose = require("mongoose");
const User = require("../models/User");

mongoose.connect("mongodb://localhost:27017/mkhondechain");

async function createUser() {
  try {
    const user = await User.create({
      phone: "265995049331",
      walletAddress: "0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    });

    console.log("User created:", user);
  } catch (err) {
    console.error("Failed to create user:", err.message);
  } finally {
    mongoose.disconnect();
  }
}

createUser();
