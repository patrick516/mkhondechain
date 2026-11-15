const disputes = require("../../controllers/disputeController");
const logger = require("../../utils/logger");
const { comparePin } = require("../../utils/memberAuth");
const { PIN_PROMPT } = require("./helpers");

async function handleDispute({ member, input, level, phoneNumber }) {
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
        `CON Fotokozani vuto lanu mwachidule:\n` +
        `Briefly describe your problem:`;
    }
  } else if (level === 3) {
    const description = input[2];
    if (!description || description.trim().length === 0) {
      response =
        `END Palibe zolembedwa. Yesaninso.\n` + `Nothing entered. Try again.`;
    } else {
      try {
        await disputes.raiseDisputeViaUSSD(
          phoneNumber,
          description.trim(),
          null,
        );
        response =
          `END Vuto lanu latumizidwa. / Your report was submitted.\n` +
          `Mtsogoleri wa gulu lanu adziwa. / Your group leader has been notified.\n` +
          `Zikomo! / Thank you!`;
      } catch (err) {
        logger.error("USSD_DISPUTE_ERROR", {
          phoneNumber,
          error: err.message,
        });
        response = `END Palibe. ${err.message}`;
      }
    }
  }

  return response;
}

module.exports = handleDispute;
