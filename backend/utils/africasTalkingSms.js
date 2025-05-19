require("dotenv").config();
const africastalking = require("africastalking");

const at = africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sendSms = async (phone, message) => {
  try {
    const result = await at.SMS.send({
      to: [phone],
      message,
      from: "AFRICASTKNG", // use "Mkhonde" if verified
    });
    console.log("SMS sent:", result);
  } catch (error) {
    console.error(" SMS failed:", error.message);
    throw error;
  }
};

module.exports = sendSms;
