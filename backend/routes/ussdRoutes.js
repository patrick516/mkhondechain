// USSD Routes — MkhondeChain (Secure)
// Bilingual: English + Chichewa
// Every transaction requires PIN verification.
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const savings = require("../controllers/savingsController");
const disputes = require("../controllers/disputeController");
const prisma = require("../utils/prismaClient");
const { comparePin } = require("../utils/memberAuth");
const getSettingsForGroup = require("../utils/getSettingsForGroup");
const logger = require("../utils/logger");

// HELPERS

const formatDueDate = (loanDueDate) => {
  if (!loanDueDate || loanDueDate === 0) return "N/A";
  const date = new Date(loanDueDate * 1000);
  return date.toDateString();
};

// ─────────────────────────────────────────────────────────────
// FORCED PIN CHANGE FLOW
// Runs instead of the main menu whenever member.mustChangePin is
// true. Steps: enter current PIN → enter new 4-digit PIN → confirm.
// ─────────────────────────────────────────────────────────────

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

// MAIN USSD HANDLER

router.post("/", async (req, res) => {
  const { phoneNumber, text, sessionId } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;

  logger.info("USSD_REQUEST", { phoneNumber, text, sessionId, ip: clientIp });

  const input = text ? text.split("*") : [""];
  const level = input.length;
  let response = "";

  try {
    // ── Check registration ─────────────────────────────────
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

    // ── Forced PIN change (first login, or after a leader reset) ──
    // Intercepts the ENTIRE session — no menu access until the
    // member sets their own new PIN. This never sends a PIN over
    // SMS; the leader gives the member their initial PIN directly.
    if (member.mustChangePin) {
      response = await handleForcedPinChange(member, input, level);
      res.set("Content-Type", "text/plain");
      return res.send(response);
    }

    // ── Group settings (repay days etc.) ────────────────────
    const settings = await getSettingsForGroup(prisma, member.groupId);
    const repayDays = settings?.repayDays || 30;

    // ── MAIN MENU ──────────────────────────────────────────
    if (text === "") {
      response =
        `CON Takulandirani, ${member.firstName}!\n` +
        `Welcome to MkhondeChain\n` +
        `─────────────────\n` +
        `1. Sungani Ndalama / Save\n` +
        `2. Tengani Ngongole / Borrow\n` +
        `3. Bwezerani Ngongole / Repay\n` +
        `4. Onani Ndalama / Balance\n` +
        `5. Nenani Vuto / Report a Problem`;

      // 1. SAVE MONEY
    } else if (input[0] === "1") {
      if (level === 1) {
        response = `CON Lowetsani PIN yanu:\n` + `Enter your PIN:`;
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

      // 2. BORROW MONEY
    } else if (input[0] === "2") {
      if (level === 1) {
        response = `CON Lowetsani PIN yanu:\n` + `Enter your PIN:`;
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

      // 3. REPAY LOAN
    } else if (input[0] === "3") {
      if (level === 1) {
        response = `CON Lowetsani PIN yanu:\n` + `Enter your PIN:`;
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
      // 5. REPORT A PROBLEM (DISPUTE)
    } else if (input[0] === "5") {
      if (level === 1) {
        response = `CON Lowetsani PIN yanu:\n` + `Enter your PIN:`;
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
            `END Palibe zolembedwa. Yesaninso.\n` +
            `Nothing entered. Try again.`;
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
