const savings = require("../../controllers/savingsController");
const { comparePin } = require("../../utils/memberAuth");
const { formatDueDate, PIN_PROMPT } = require("./helpers");

async function handleBalance({ member, input, level, phoneNumber }) {
  let response = "";

  if (level === 1) {
    response = PIN_PROMPT;
  } else if (level === 2) {
    const pin = input[1];
    const validPin = await comparePin(pin, member.pinHash);
    if (!validPin) {
      response = `END PIN yolakwika. / Invalid PIN.`;
    } else {
      try {
        const bal = await savings.getBalanceForUSSD(phoneNumber);

        response =
          `END Ndalama Zanu / Your Account\n` +
          `─────────────────\n` +
          `Zasungidwa / Saved:\n` +
          `MK${bal.totalSaved.toLocaleString()}\n` +
          `─────────────────\n` +
          `Ngongole / Loan:\n` +
          `MK${bal.loanAmount.toLocaleString()}\n` +
          (bal.loanAmount > 0
            ? `Ngati mubweza lero: MK${bal.owedIfPaidToday.toLocaleString()}\n` +
              `If paid today: MK${bal.owedIfPaidToday.toLocaleString()}\n` +
              `Kubweza: ${formatDueDate(bal.loanDueDate)}\n`
            : ``) +
          `─────────────────\n` +
          `Mutha kutenga / Can borrow:\n` +
          `MK${bal.eligibleToBorrow.toLocaleString()}`;
      } catch (err) {
        response =
          `END Palibe. Yesaninso.\n` +
          `Could not fetch balance. Please try again.`;
      }
    }
  }

  return response;
}

module.exports = handleBalance;
