const { getAddress } = require("ethers").utils;
const User = require("../models/User");

exports.getWalletAddressByPhone = async (phoneNumber) => {
  try {
    const normalized = phoneNumber.startsWith("+")
      ? phoneNumber.slice(1)
      : phoneNumber;

    const user = await User.findOne({ phone: normalized });
    if (!user || !user.walletAddress) {
      console.log("❌ User not found or wallet missing");
      return null;
    }

    const trimmedAddress = user.walletAddress.trim();

    try {
      return getAddress(trimmedAddress); // validate + checksum
    } catch (e) {
      console.warn("⚠️ Invalid checksum for address:", trimmedAddress);
      return trimmedAddress; // fallback for now
    }
  } catch (error) {
    console.error("⚠️ Error in getWalletAddressByPhone:", error.message);
    return null;
  }
};
