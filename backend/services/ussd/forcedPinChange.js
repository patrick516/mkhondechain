const bcrypt = require("bcrypt");
const prisma = require("../../utils/prismaClient");
const { comparePin } = require("../../utils/memberAuth");
const logger = require("../../utils/logger");

async function handleForcedPinChange(member, input, level) {
  if (level === 1) {
    return (
      `CON Kusintha PIN kofunika. / PIN change required.\n` +
      `Lowetsani PIN yanu yakale:\n` +
      `Enter your CURRENT PIN:`
    );
  }

  if (level === 2) {
    const currentPin = input[1];
    const validPin = await comparePin(currentPin, member.pinHash);
    if (!validPin) {
      return `END PIN yolakwika. / Invalid PIN. Try again.`;
    }
    return (
      `CON Lowetsani PIN yatsopano (manambala 4):\n` +
      `Enter your NEW 4-digit PIN:`
    );
  }

  if (level === 3) {
    const currentPin = input[1];
    const validPin = await comparePin(currentPin, member.pinHash);
    if (!validPin) {
      return `END PIN yolakwika. / Invalid PIN. Try again.`;
    }

    const newPin = input[2];
    if (!/^\d{4}$/.test(newPin)) {
      return `END PIN iyenera kukhala manambala 4. / PIN must be exactly 4 digits.`;
    }

    return `CON Tsimikizani PIN yatsopano:\n` + `Confirm your NEW PIN:`;
  }

  if (level === 4) {
    const newPin = input[2];
    const confirmPin = input[3];

    if (newPin !== confirmPin) {
      return `END PIN sizigwirizana. / PINs do not match. Dial again to retry.`;
    }

    const newPinHash = await bcrypt.hash(newPin, 12);
    await prisma.member.update({
      where: { id: member.id },
      data: { pinHash: newPinHash, mustChangePin: false },
    });

    logger.info("MEMBER_PIN_SELF_CHANGED", { memberId: member.id });

    return (
      `END Zachita bwino! / Success!\n` +
      `PIN yanu yasinthidwa. Dial *XXX# kuti muyambe.\n` +
      `Your PIN has been changed. Dial again to use your account.`
    );
  }

  return `END Palibe. Yesaninso. / Something went wrong. Try again.`;
}

module.exports = handleForcedPinChange;
