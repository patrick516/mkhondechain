const savings = require("../../controllers/savingsController");
const logger = require("../../utils/logger");
const { comparePin } = require("../../utils/memberAuth");
const { formatDueDate, PIN_PROMPT } = require("./helpers");

async function handleRepay({ member, input, level, phoneNumber, req }) {
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

        if (bal.loanAmount === 0) {
          response =
            `END Mulibe ngongole.\n` +
            `You have no active loan.\n` +
            `Zikomo! / Thank you!`;
        } else {
          const dueDate = formatDueDate(bal.loanDueDate);
          response =
            `CON Ngongole yanu (ndi chiwongola dzanja):\n` +
            `Total owed (with interest): MK${bal.owedIfPaidToday.toLocaleString()}\n` +
            `Due date: ${dueDate}\n` +
            `─────────────────\n` +
            `Lowetsani ndalama yobweza:\n` +
            `Enter repayment amount (MK):`;
        }
      } catch (err) {
        response =
          `CON Lowetsani ndalama yobweza:\n` + `Enter repayment amount (MK):`;
      }
    }
  } else if (level === 3) {
    const repayAmount = parseInt(input[2]);
    if (isNaN(repayAmount) || repayAmount <= 0) {
      response = `END Chiwerengero cholakwika. Invalid amount.`;
    } else {
      response =
        `CON Mukulingalira kubweza:\n` +
        `You are about to repay:\n` +
        `MK${repayAmount.toLocaleString()}\n` +
        `─────────────────\n` +
        `1. Inde / Yes\n` +
        `2. Ayi / No`;
    }
  } else if (level === 4) {
    const repayAmount = parseInt(input[2]);
    const confirm = input[3];

    if (confirm === "2") {
      response = `END Mwasiya. Cancelled. Zikomo!`;
    } else if (confirm === "1") {
      try {
        const result = await savings.repayLoanViaUSSD(
          phoneNumber,
          repayAmount,
          req,
        );
        response =
          `END Zachita bwino! / Success!\n` +
          `MK${repayAmount.toLocaleString()} yabwezedwa.\n` +
          `Loan balance: MK${result.loanBalance.toLocaleString()}\n` +
          `Zikomo kwambiri! / Thank you!`;
      } catch (err) {
        logger.error("USSD_REPAY_ERROR", {
          phoneNumber,
          amount: repayAmount,
          error: err.message,
        });
        response = `END Palibe. ${err.message}`;
      }
    } else {
      response = `END Sankhani 1 kapena 2.`;
    }
  }

  return response;
}

module.exports = handleRepay;
