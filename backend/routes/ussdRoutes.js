// ─────────────────────────────────────────────────────────────
// USSD Routes — MkhondeChain (Secure, Non-Blockchain)
// Bilingual: English + Chichewa
// Every transaction requires PIN verification.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const savings = require("../controllers/savingsController");
const Member = require("../models/memberModel");
const SystemSetting = require("../models/systemSettingModel");
const logger = require("../utils/logger");

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const formatDueDate = (loanDueDate) => {
  if (!loanDueDate || loanDueDate === 0) return "N/A";
  const date = new Date(loanDueDate * 1000);
  return date.toDateString();
};

// ─────────────────────────────────────────────────────────────
// MAIN USSD HANDLER
// ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { phoneNumber, text, sessionId } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;

  logger.info("USSD_REQUEST", { phoneNumber, text, sessionId, ip: clientIp });

  const input = text ? text.split("*") : [""];
  const level = input.length;
  let response = "";

  try {
    // ── Check registration ─────────────────────────────────
    const member = await Member.findOne({
      phone: phoneNumber,
      status: "active",
    });

    if (!member) {
      response =
        `END Simunalembetsedwe / Not registered.\n` +
        `Lankhulani ndi mtsogoleri wa gulu lanu.\n` +
        `Contact your group leader to join.`;
      res.set("Content-Type", "text/plain");
      return res.send(response);
    }

    // ── PIN Verification (required for all transactions) ────
    // PIN is collected as first input after menu selection
    // Session state would ideally be stored in Redis; for now, we use text pattern
    // Format: menu*pin*amount*confirm

    const setting = await SystemSetting.findOne();
    const repayDays = setting?.repayDays || 30;

    // ── MAIN MENU ──────────────────────────────────────────
    if (text === "") {
      response =
        `CON Takulandirani, ${member.firstName}!\n` +
        `Welcome to MkhondeChain\n` +
        `─────────────────\n` +
        `1. Sungani Ndalama / Save\n` +
        `2. Tengani Ngongole / Borrow\n` +
        `3. Bwezerani Ngongole / Repay\n` +
        `4. Onani Ndalama / Balance`;

      // ────────────────────────────────────────────────────────
      // 1. SAVE MONEY
      // ────────────────────────────────────────────────────────
    } else if (input[0] === "1") {
      if (level === 1) {
        response = `CON Lowetsani PIN yanu:\n` + `Enter your PIN:`;
      } else if (level === 2) {
        const pin = input[1];
        const validPin = await member.comparePin(pin);
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
          response =
            `END Ndalama yochepa kwambiri.\n` + `Minimum amount is MK100.`;
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
        const pin = input[1];
        const amount = parseInt(input[2]);
        const confirm = input[3];

        if (confirm === "2") {
          response = `END Mwasiya. Cancelled. Zikomo!`;
        } else if (confirm === "1") {
          try {
            const result = await savings.depositViaUSSD(
              phoneNumber,
              amount,
              req,
            );
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
            response =
              `END Palibe. Yesaninso.\n` + `Save failed: ${err.message}`;
          }
        } else {
          response = `END Sankhani 1 kapena 2. Select 1 or 2.`;
        }
      }

      // ────────────────────────────────────────────────────────
      // 2. BORROW MONEY
      // ────────────────────────────────────────────────────────
    } else if (input[0] === "2") {
      if (level === 1) {
        response = `CON Lowetsani PIN yanu:\n` + `Enter your PIN:`;
      } else if (level === 2) {
        const pin = input[1];
        const validPin = await member.comparePin(pin);
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
            } else if (eligible === 0) {
              response =
                `END Mulibe ndalama zosungidwa.\n` +
                `You have no savings. Save first to borrow.`;
            } else {
              response =
                `CON Mutha kutenga: MK${eligible.toLocaleString()}\n` +
                `You can borrow up to: MK${eligible.toLocaleString()}\n` +
                `Kubweza: Masiku ${repayDays}\n` +
                `Repay in: ${repayDays} days\n` +
                `─────────────────\n` +
                `1. MK1,000\n` +
                `2. MK2,000\n` +
                `3. MK3,000\n` +
                `4. Ena / Other amount`;
            }
          } catch (err) {
            response =
              `CON Mutha kutenga ngongole.\n` +
              `You can borrow a loan.\n` +
              `─────────────────\n` +
              `1. MK1,000\n` +
              `2. MK2,000\n` +
              `3. MK3,000\n` +
              `4. Ena / Other amount`;
          }
        }
      } else if (level === 3) {
        const amountMap = { 1: 1000, 2: 2000, 3: 3000 };

        if (["1", "2", "3"].includes(input[2])) {
          const borrowAmount = amountMap[input[2]];
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
        } else if (input[2] === "4") {
          response =
            `CON Lowetsani ndalama yotenga:\n` +
            `Enter custom amount (MK):\n` +
            `e.g. 1500`;
        } else {
          response = `END Sankhani 1-4. Invalid selection.`;
        }
      } else if (level === 4) {
        const amountMap = { 1: 1000, 2: 2000, 3: 3000 };

        if (["1", "2", "3"].includes(input[2])) {
          const borrowAmount = amountMap[input[2]];
          const confirm = input[3];

          if (confirm === "2") {
            response = `END Mwasiya. Cancelled. Zikomo!`;
          } else if (confirm === "1") {
            try {
              const result = await savings.requestLoan(
                phoneNumber,
                borrowAmount,
                req,
              );
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
        } else if (input[2] === "4") {
          const customAmount = parseInt(input[3]);
          if (isNaN(customAmount) || customAmount <= 0) {
            response = `END Chiwerengero cholakwika. Invalid amount.`;
          } else {
            const canBorrow = await savings.canBorrow(
              phoneNumber,
              customAmount,
            );
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
      } else if (level === 5 && input[2] === "4") {
        const customAmount = parseInt(input[3]);
        const confirm = input[4];

        if (confirm === "2") {
          response = `END Mwasiya. Cancelled. Zikomo!`;
        } else if (confirm === "1") {
          try {
            const result = await savings.requestLoan(
              phoneNumber,
              customAmount,
              req,
            );
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

      // ────────────────────────────────────────────────────────
      // 3. REPAY LOAN
      // ────────────────────────────────────────────────────────
    } else if (input[0] === "3") {
      if (level === 1) {
        response = `CON Lowetsani PIN yanu:\n` + `Enter your PIN:`;
      } else if (level === 2) {
        const pin = input[1];
        const validPin = await member.comparePin(pin);
        if (!validPin) {
          response = `END PIN yolakwika. / Invalid PIN.`;
        } else {
          try {
            const bal = await savings.getBalanceForUSSD(phoneNumber);
            const loanMK = bal.loanAmount;

            if (loanMK === 0) {
              response =
                `END Mulibe ngongole.\n` +
                `You have no active loan.\n` +
                `Zikomo! / Thank you!`;
            } else {
              const dueDate = formatDueDate(bal.loanDueDate);
              response =
                `CON Ngongole yanu:\n` +
                `Your loan: MK${loanMK.toLocaleString()}\n` +
                `Due date: ${dueDate}\n` +
                `─────────────────\n` +
                `Lowetsani ndalama yobweza:\n` +
                `Enter repayment amount (MK):`;
            }
          } catch (err) {
            response =
              `CON Lowetsani ndalama yobweza:\n` +
              `Enter repayment amount (MK):`;
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

      // ────────────────────────────────────────────────────────
      // 4. VIEW BALANCE
      // ────────────────────────────────────────────────────────
    } else if (input[0] === "4") {
      if (level === 1) {
        response = `CON Lowetsani PIN yanu:\n` + `Enter your PIN:`;
      } else if (level === 2) {
        const pin = input[1];
        const validPin = await member.comparePin(pin);
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
                ? `Kubweza: ${formatDueDate(bal.loanDueDate)}\n`
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
    } else {
      response =
        `END Sankhani yolondola 1-4.\n` + `Invalid option. Choose 1 to 4.`;
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
