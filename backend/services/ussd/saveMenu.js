const savings = require("../../controllers/savingsController");
const logger = require("../../utils/logger");
const { comparePin } = require("../../utils/memberAuth");
const { PIN_PROMPT } = require("./helpers");

async function handleSave({ member, input, level, phoneNumber, req }) {
  let response = "";

  if (level === 1) {
    response = PIN_PROMPT;
  } else if (level === 2) {
    const pin = input[1];
    const validPin = await comparePin(pin, member.pinHash);
    if (!validPin) {
      response = `END PIN yolakwika. / Invalid PIN.`;
    } else {
      response =
        `CON Lowetsani ndalama yosungira:\n` +
        `Enter amount to save (MK):\n` +
        `e.g. 2000`;
    }
  } else if (level === 3) {
    const amount = parseInt(input[2]);
    if (isNaN(amount) || amount <= 0) {
      response =
        `END Chiwerengero cholakwika.\n` +
        `Invalid amount. Enter a number\n` +
        `e.g. 2000`;
    } else if (amount < 100) {
      response = `END Ndalama yochepa kwambiri.\n` + `Minimum amount is MK100.`;
    } else {
      response =
        `CON Mukulingalira kusungira:\n` +
        `You are about to save:\n` +
        `MK${amount.toLocaleString()}\n` +
        `─────────────────\n` +
        `1. Inde, pitirizani / Yes\n` +
        `2. Ayi, bwerani / No`;
    }
  } else if (level === 4) {
    const amount = parseInt(input[2]);
    const confirm = input[3];

    if (confirm === "2") {
      response = `END Mwasiya. Cancelled. Zikomo!`;
    } else if (confirm === "1") {
      try {
        const result = await savings.depositViaUSSD(phoneNumber, amount, req);
        response =
          `END Zachita bwino! / Success!\n` +
          `MK${amount.toLocaleString()} yasungidwa.\n` +
          `Balance: MK${result.balance.toLocaleString()}\n` +
          `Zikomo! / Thank you!`;
      } catch (err) {
        logger.error("USSD_SAVE_ERROR", {
          phoneNumber,
          amount,
          error: err.message,
        });
        response = `END Palibe. Yesaninso.\n` + `Save failed: ${err.message}`;
      }
    } else {
      response = `END Sankhani 1 kapena 2. Select 1 or 2.`;
    }
  }

  return response;
}

module.exports = handleSave;
