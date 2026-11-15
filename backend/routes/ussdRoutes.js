// File: backend/routes/ussdRoutes.js
// USSD entry point. It only checks who is calling and then hands the
// request to the right menu file in services/ussd/.

const express = require("express");
const router = express.Router();
const prisma = require("../utils/prismaClient");
const getSettingsForGroup = require("../utils/getSettingsForGroup");
const logger = require("../utils/logger");

const handleForcedPinChange = require("../services/ussd/forcedPinChange");
const mainMenu = require("../services/ussd/mainMenu");
const handleSave = require("../services/ussd/saveMenu");
const handleBorrow = require("../services/ussd/borrowMenu");
const handleRepay = require("../services/ussd/repayMenu");
const handleBalance = require("../services/ussd/balanceMenu");
const handleDispute = require("../services/ussd/disputeMenu");

// Map from the first digit the member pressed to its menu file.
// A Map (not a plain object) so odd input like "constructor" can
// never match by accident.
const menus = new Map([
  ["1", handleSave],
  ["2", handleBorrow],
  ["3", handleRepay],
  ["4", handleBalance],
  ["5", handleDispute],
]);

router.post("/", async (req, res) => {
  // Africa's Talking sends these three fields on every request.
  const { phoneNumber, text, sessionId } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;

  logger.info("USSD_REQUEST", { phoneNumber, text, sessionId, ip: clientIp });

  // "1*2000*1" becomes ["1","2000","1"]; level = how many steps so far.
  const input = text ? text.split("*") : [""];
  const level = input.length;
  let response = "";

  try {
    // Only active, registered members may use the menu.
    const member = await prisma.member.findFirst({
      where: { phone: phoneNumber, status: "active" },
    });

    if (!member) {
      response =
        `END Simunalembetsedwe / Not registered.\n` +
        `Lankhulani ndi mtsogoleri wa gulu lanu.\n` +
        `Contact your group leader to join.`;
      res.set("Content-Type", "text/plain");
      return res.send(response);
    }

    // First login or after a leader reset: the whole session is the
    // PIN change flow. No menu access until a new PIN is set.
    if (member.mustChangePin) {
      response = await handleForcedPinChange(member, input, level);
      res.set("Content-Type", "text/plain");
      return res.send(response);
    }

    // Group settings (for example how many days a loan may run).
    const settings = await getSettingsForGroup(prisma, member.groupId);
    const repayDays = settings?.repayDays || 30;

    // Everything a menu file may need, in one object.
    const ctx = { member, input, level, phoneNumber, req, repayDays };
    const handler = menus.get(input[0]);

    if (text === "") {
      response = mainMenu(member); // nothing pressed yet: show the menu
    } else if (handler) {
      response = await handler(ctx); // options 1 to 5
    } else {
      response =
        `END Sankhani yolondola 1-5.\n` + `Invalid option. Choose 1 to 5.`;
    }
  } catch (error) {
    logger.error("USSD_FATAL_ERROR", {
      phoneNumber,
      error: error.message,
      stack: error.stack,
    });
    response =
      `END Pali vuto. Yesaninso.\n` + `System error. Please try again.`;
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
});

module.exports = router;
