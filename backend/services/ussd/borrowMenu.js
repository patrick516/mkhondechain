const savings = require("../../controllers/savingsController");
const logger = require("../../utils/logger");
const { comparePin } = require("../../utils/memberAuth");
const { formatDueDate, PIN_PROMPT } = require("./helpers");

const { buildBorrowOptions } = require("./borrowOptions");

// Reads the member's current figures and works out the amounts to offer.
async function getOffer(phoneNumber) {
  const bal = await savings.getBalanceForUSSD(phoneNumber);
  return { options: buildBorrowOptions(bal.eligibleToBorrow) };
}

// Turns the amounts into numbered menu lines, then adds "Other amount" last.
function renderOptions(options) {
  const lines = options.map(
    (amount, i) => `${i + 1}. MK${amount.toLocaleString()}`,
  );
  lines.push(`${options.length + 1}. Ena / Other amount`);
  return lines.join("\n");
}

async function handleBorrow({
  member,
  input,
  level,
  phoneNumber,
  req,
  repayDays,
}) {
  let response = "";

  // From step 3 onward, work out the amounts on offer, and which
  // number the member pressed. Steps 1 and 2 do not need this.
  const offer = level >= 3 ? await getOffer(phoneNumber) : null;
  const options = offer ? offer.options : [];
  const choice = parseInt(input[2]);

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
        const eligible = bal.eligibleToBorrow;
        const hasLoan = bal.loanAmount > 0;

        if (hasLoan) {
          const dueDate = formatDueDate(bal.loanDueDate);
          response =
            `END Muli ndi ngongole kale.\n` +
            `You have an active loan:\n` +
            `MK${bal.loanAmount.toLocaleString()}\n` +
            `Due: ${dueDate}\n` +
            `Bwezerani kaye. Repay first (3).`;
        } else if (buildBorrowOptions(eligible).length === 0) {
          response =
            `END Ndalama zanu zosungidwa ndi zochepa.\n` +
            `Your savings are too low to borrow yet.\n` +
            `Save more first.`;
        } else {
          response =
            `CON Mutha kutenga: MK${eligible.toLocaleString()}\n` +
            `You can borrow up to: MK${eligible.toLocaleString()}\n` +
            `Kubweza: Masiku ${repayDays}\n` +
            `Repay in: ${repayDays} days\n` +
            `─────────────────\n` +
            renderOptions(buildBorrowOptions(eligible));
        }
      } catch (err) {
        response =
          `END Palibe. Yesaninso.\n` +
          `Could not check your savings. Please try again.`;
      }
    }
  } else if (level === 3) {
    if (choice >= 1 && choice <= options.length) {
      const borrowAmount = options[choice - 1];
      const canBorrow = await savings.canBorrow(phoneNumber, borrowAmount);

      if (!canBorrow) {
        response =
          `END Mulibe ndalama yokwanira.\n` +
          `Not eligible for MK${borrowAmount.toLocaleString()}.\n` +
          `Sungani ndalama zambiri.\n` +
          `Save more first.`;
      } else {
        response =
          `CON Mukulingalira kutenga:\n` +
          `You are about to borrow:\n` +
          `MK${borrowAmount.toLocaleString()}\n` +
          `Kubweza mu masiku: ${repayDays}\n` +
          `Repay in: ${repayDays} days\n` +
          `─────────────────\n` +
          `1. Inde / Yes\n` +
          `2. Ayi / No`;
      }
    } else if (choice === options.length + 1) {
      response =
        `CON Lowetsani ndalama yotenga:\n` +
        `Enter custom amount (MK):\n` +
        `e.g. 1500`;
    } else {
      response = `END Sankhani yolondola. Invalid selection.`;
    }
  } else if (level === 4) {
    if (choice >= 1 && choice <= options.length) {
      const borrowAmount = options[choice - 1];
      const confirm = input[3];

      if (confirm === "2") {
        response = `END Mwasiya. Cancelled. Zikomo!`;
      } else if (confirm === "1") {
        try {
          await savings.requestLoan(phoneNumber, borrowAmount, req);
          response =
            `END Ngongole yafunsidwa! / Loan requested!\n` +
            `MK${borrowAmount.toLocaleString()}.\n` +
            `Yikuyembekezera kuvomerezedwa.\n` +
            `Waiting for group leader approval.`;
        } catch (err) {
          logger.error("USSD_BORROW_ERROR", {
            phoneNumber,
            amount: borrowAmount,
            error: err.message,
          });
          response = `END Palibe. ${err.message}`;
        }
      } else {
        response = `END Sankhani 1 kapena 2. Select 1 or 2.`;
      }
    } else if (choice === options.length + 1) {
      const customAmount = parseInt(input[3]);
      if (isNaN(customAmount) || customAmount <= 0) {
        response = `END Chiwerengero cholakwika. Invalid amount.`;
      } else {
        const canBorrow = await savings.canBorrow(phoneNumber, customAmount);
        if (!canBorrow) {
          response =
            `END Mulibe ndalama yokwanira.\n` +
            `Not eligible for MK${customAmount.toLocaleString()}.\n` +
            `Save more first.`;
        } else {
          response =
            `CON Mukulingalira kutenga:\n` +
            `You are about to borrow:\n` +
            `MK${customAmount.toLocaleString()}\n` +
            `Kubweza mu masiku: ${repayDays}\n` +
            `─────────────────\n` +
            `1. Inde / Yes\n` +
            `2. Ayi / No`;
        }
      }
    }
  } else if (level === 5 && choice === options.length + 1) {
    const customAmount = parseInt(input[3]);
    const confirm = input[4];

    if (confirm === "2") {
      response = `END Mwasiya. Cancelled. Zikomo!`;
    } else if (confirm === "1") {
      try {
        await savings.requestLoan(phoneNumber, customAmount, req);
        response =
          `END Ngongole yafunsidwa! / Loan requested!\n` +
          `MK${customAmount.toLocaleString()}.\n` +
          `Waiting for group leader approval.`;
      } catch (err) {
        response = `END Palibe. ${err.message}`;
      }
    } else {
      response = `END Sankhani 1 kapena 2.`;
    }
  }

  // Safety net: never send an empty reply, which breaks the USSD session.
  if (!response) {
    response = `END Palibe. Yesaninso. / Something went wrong. Try again.`;
  }

  return response;
}

module.exports = handleBorrow;
