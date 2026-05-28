// ─────────────────────────────────────────────────────────────
// USSD Routes — MkhondeChain
// Bilingual: English + Chichewa
// Handles: Save, Borrow, Repay, View Balance
// ─────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const savings = require("../controllers/savingsController");
const userService = require("../services/userService");
const Member = require("../models/memberModel");

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// Convert ETH value to MWK display string
// 1 ETH = 1000 MWK in this system
const toMK = (ethValue) => {
  const mk = parseFloat(ethValue) * 1000;
  return `MK${Math.floor(mk).toLocaleString()}`;
};

// Convert raw MWK amount to ETH for contract
const toEth = (mkAmount) => (mkAmount / 1000).toString();

// ─────────────────────────────────────────────────────────────
// MAIN USSD HANDLER
// ─────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { phoneNumber, text } = req.body;

  console.log(`[USSD] Phone: ${phoneNumber} | Input: "${text}"`);

  const input = text ? text.split("*") : [""];
  const level = input.length;
  let response = "";

  try {
    // ── Check if member is registered ──────────────────────
    const ethAddress = await userService.getWalletAddressByPhone(phoneNumber);
    const member = await Member.findOne({ phone: phoneNumber });

    if (!member || !ethAddress) {
      response =
        `END Simunalembetsedwe / Not registered.\n` +
        `Lankhulani ndi mtsogoleri wa gulu lanu.\n` +
        `Contact your group leader to join.`;

      res.set("Content-Type", "text/plain");
      return res.send(response);
    }

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
        response =
          `CON Lowetsani ndalama yosungira:\n` +
          `Enter amount to save (MK):\n` +
          `e.g. 2000`;
      } else if (level === 2) {
        const amount = parseInt(input[1]);

        if (isNaN(amount) || amount <= 0) {
          response =
            `END Chiwerengero cholakwika.\n` +
            `Invalid amount. Please enter\n` +
            `a number e.g. 2000`;
        } else if (amount < 100) {
          response =
            `END Ndalama yochepa kwambiri.\n` +
            `Minimum amount is MK100.\n` +
            `Yochepa kwambiri ndi MK100.`;
        } else {
          response =
            `CON Mukulingalira kusungira:\n` +
            `You are about to save:\n` +
            `MK${amount.toLocaleString()}\n` +
            `─────────────────\n` +
            `1. Inde, pitirizani / Yes\n` +
            `2. Ayi, bwerani / No`;
        }
      } else if (level === 3) {
        const amount = parseInt(input[1]);
        const confirm = input[2];

        if (confirm === "2") {
          response =
            `END Mwasiya. Transaction cancelled.\n` + `Zikomo / Thank you.`;
        } else if (confirm === "1") {
          try {
            await savings.depositViaUSSD(phoneNumber, amount, req);
            response =
              `END Zachita bwino! / Success!\n` +
              `MK${amount.toLocaleString()} yasungidwa.\n` +
              `MK${amount.toLocaleString()} saved.\n` +
              `Zikomo! / Thank you!`;
          } catch (err) {
            console.error("[USSD Save Error]", err.message);
            response =
              `END Palibe. Yesaninso.\n` +
              `Save failed. Please try again.\n` +
              `Mukhoza kuloweza kachiwiri.`;
          }
        } else {
          response = `END Sankhani 1 kapena 2.\n` + `Select 1 or 2.`;
        }
      }

      // ────────────────────────────────────────────────────────
      // 2. BORROW MONEY
      // ────────────────────────────────────────────────────────
    } else if (input[0] === "2") {
      if (level === 1) {
        // Show how much they can borrow first
        try {
          const bal = await savings.getBalanceForUSSD(phoneNumber);
          const eligible = toMK(bal.eligibleToBorrow);
          const hasLoan = parseFloat(bal.loanAmount) > 0;

          if (hasLoan) {
            response =
              `END Muli ndi ngongole kale.\n` +
              `You already have an active loan.\n` +
              `Bwezerani ngongole yanu kaye.\n` +
              `Please repay it first (Option 3).`;
          } else {
            response =
              `CON Mutha kutenga: ${eligible}\n` +
              `You can borrow up to: ${eligible}\n` +
              `─────────────────\n` +
              `1. MK1,000\n` +
              `2. MK2,000\n` +
              `3. MK3,000\n` +
              `4. Ena / Other amount`;
          }
        } catch (err) {
          response =
            `CON Sankhani ndalama yotenga:\n` +
            `Select amount to borrow:\n` +
            `1. MK1,000\n` +
            `2. MK2,000\n` +
            `3. MK3,000\n` +
            `4. Ena / Other amount`;
        }
      } else if (level === 2) {
        const amountMap = { 1: 1000, 2: 2000, 3: 3000 };

        if (["1", "2", "3"].includes(input[1])) {
          const borrowAmount = amountMap[input[1]];
          const canBorrow = await savings.canBorrow(phoneNumber, borrowAmount);

          if (!canBorrow) {
            response =
              `END Mulibe ndalama yokwanira.\n` +
              `Not eligible for MK${borrowAmount.toLocaleString()}.\n` +
              `Sungani ndalama zambiri kaye.\n` +
              `Save more first to qualify.`;
          } else {
            response =
              `CON Mukulingalira kutenga:\n` +
              `You are about to borrow:\n` +
              `MK${borrowAmount.toLocaleString()}\n` +
              `Ndalama ipita ku Mpamba/Airtel.\n` +
              `Money sent to your wallet.\n` +
              `─────────────────\n` +
              `1. Inde, pitirizani / Yes\n` +
              `2. Ayi, bwerani / No`;
          }
        } else if (input[1] === "4") {
          response =
            `CON Lowetsani ndalama yotenga:\n` +
            `Enter custom amount (MK):\n` +
            `e.g. 1500`;
        } else {
          response =
            `END Sankhani 1, 2, 3 kapena 4.\n` +
            `Invalid selection. Try again.`;
        }
      } else if (level === 3) {
        const amountMap = { 1: 1000, 2: 2000, 3: 3000 };

        // Confirmation for preset amounts
        if (["1", "2", "3"].includes(input[1])) {
          const borrowAmount = amountMap[input[1]];
          const confirm = input[2];

          if (confirm === "2") {
            response =
              `END Mwasiya. Transaction cancelled.\n` + `Zikomo / Thank you.`;
          } else if (confirm === "1") {
            try {
              await savings.requestLoan(phoneNumber, borrowAmount, req);
              const loan = await savings.sendLoanToMobile(
                phoneNumber,
                borrowAmount,
              );

              if (loan.entries && loan.entries[0].status === "Queued") {
                response =
                  `END Ngongole yapita! / Loan sent!\n` +
                  `MK${borrowAmount.toLocaleString()} yapita ku wallet yanu.\n` +
                  `MK${borrowAmount.toLocaleString()} sent to your wallet.\n` +
                  `Bwezerani mu masiku 30.\n` +
                  `Repay within 30 days.`;
              } else {
                response =
                  `END Palibe. Yesaninso.\n` + `Loan failed. Please try again.`;
              }
            } catch (err) {
              console.error("[USSD Borrow Error]", err.message);
              response =
                `END Palibe. Yesaninso.\n` +
                `Borrow failed. Please try again.\n` +
                `Mukhoza kuloweza kachiwiri.`;
            }
          } else {
            response = `END Sankhani 1 kapena 2.\n` + `Select 1 or 2.`;
          }

          // Custom amount — check eligibility
        } else if (input[1] === "4") {
          const customAmount = parseInt(input[2]);

          if (isNaN(customAmount) || customAmount <= 0) {
            response =
              `END Chiwerengero cholakwika.\n` + `Invalid amount. Try again.`;
          } else {
            const canBorrow = await savings.canBorrow(
              phoneNumber,
              customAmount,
            );
            if (!canBorrow) {
              response =
                `END Mulibe ndalama yokwanira.\n` +
                `Not eligible for MK${customAmount.toLocaleString()}.\n` +
                `Sungani ndalama zambiri kaye.\n` +
                `Save more to qualify.`;
            } else {
              response =
                `CON Mukulingalira kutenga:\n` +
                `You are about to borrow:\n` +
                `MK${customAmount.toLocaleString()}\n` +
                `─────────────────\n` +
                `1. Inde, pitirizani / Yes\n` +
                `2. Ayi, bwerani / No`;
            }
          }
        } else {
          response = `END Sankhani yolondola.\n` + `Invalid selection.`;
        }

        // Custom amount confirmation (level 4)
      } else if (level === 4 && input[1] === "4") {
        const customAmount = parseInt(input[2]);
        const confirm = input[3];

        if (confirm === "2") {
          response =
            `END Mwasiya. Transaction cancelled.\n` + `Zikomo / Thank you.`;
        } else if (confirm === "1") {
          try {
            await savings.requestLoan(phoneNumber, customAmount, req);
            const loan = await savings.sendLoanToMobile(
              phoneNumber,
              customAmount,
            );

            if (loan.entries && loan.entries[0].status === "Queued") {
              response =
                `END Ngongole yapita! / Loan sent!\n` +
                `MK${customAmount.toLocaleString()} yapita ku wallet yanu.\n` +
                `MK${customAmount.toLocaleString()} sent to your wallet.\n` +
                `Bwezerani mu masiku 30.\n` +
                `Repay within 30 days.`;
            } else {
              response =
                `END Palibe. Yesaninso.\n` + `Loan failed. Please try again.`;
            }
          } catch (err) {
            console.error("[USSD Custom Borrow Error]", err.message);
            response =
              `END Palibe. Yesaninso.\n` + `Borrow failed. Please try again.`;
          }
        } else {
          response = `END Sankhani 1 kapena 2.\n` + `Select 1 or 2.`;
        }
      }

      // ────────────────────────────────────────────────────────
      // 3. REPAY LOAN
      // ────────────────────────────────────────────────────────
    } else if (input[0] === "3") {
      if (level === 1) {
        try {
          const bal = await savings.getBalanceForUSSD(phoneNumber);
          const loanMK = Math.floor(parseFloat(bal.loanAmount) * 1000);

          if (loanMK === 0) {
            response =
              `END Mulibe ngongole.\n` +
              `You have no active loan.\n` +
              `Zikomo! / Thank you!`;
          } else {
            response =
              `CON Ngongole yanu: MK${loanMK.toLocaleString()}\n` +
              `Your loan: MK${loanMK.toLocaleString()}\n` +
              `─────────────────\n` +
              `Lowetsani ndalama yobweza:\n` +
              `Enter repayment amount (MK):`;
          }
        } catch (err) {
          response =
            `CON Lowetsani ndalama yobweza:\n` + `Enter repayment amount (MK):`;
        }
      } else if (level === 2) {
        const repayAmount = parseInt(input[1]);

        if (isNaN(repayAmount) || repayAmount <= 0) {
          response =
            `END Chiwerengero cholakwika.\n` + `Invalid amount. Try again.`;
        } else {
          response =
            `CON Mukulingalira kubweza:\n` +
            `You are about to repay:\n` +
            `MK${repayAmount.toLocaleString()}\n` +
            `─────────────────\n` +
            `1. Inde, pitirizani / Yes\n` +
            `2. Ayi, bwerani / No`;
        }
      } else if (level === 3) {
        const repayAmount = parseInt(input[1]);
        const confirm = input[2];

        if (confirm === "2") {
          response =
            `END Mwasiya. Transaction cancelled.\n` + `Zikomo / Thank you.`;
        } else if (confirm === "1") {
          try {
            await savings.repayLoanViaUSSD(phoneNumber, repayAmount, req);
            response =
              `END Zachita bwino! / Success!\n` +
              `MK${repayAmount.toLocaleString()} yabwezedwa.\n` +
              `MK${repayAmount.toLocaleString()} repaid.\n` +
              `Zikomo kwambiri! / Thank you!`;
          } catch (err) {
            console.error("[USSD Repay Error]", err.message);
            response =
              `END Palibe. Yesaninso.\n` +
              `Repayment failed. Try again.\n` +
              `Mukhoza kuloweza kachiwiri.`;
          }
        } else {
          response = `END Sankhani 1 kapena 2.\n` + `Select 1 or 2.`;
        }
      }

      // ────────────────────────────────────────────────────────
      // 4. VIEW BALANCE
      // ────────────────────────────────────────────────────────
    } else if (input[0] === "4") {
      try {
        const bal = await savings.getBalanceForUSSD(phoneNumber);

        response =
          `END Ndalama Zanu / Your Account:\n` +
          `─────────────────\n` +
          `Zasungidwa: ${toMK(bal.totalSaved)}\n` +
          `Saved: ${toMK(bal.totalSaved)}\n` +
          `─────────────────\n` +
          `Ngongole: ${toMK(bal.loanAmount)}\n` +
          `Loan: ${toMK(bal.loanAmount)}\n` +
          `─────────────────\n` +
          `Mutha kutenga: ${toMK(bal.eligibleToBorrow)}\n` +
          `Can borrow: ${toMK(bal.eligibleToBorrow)}`;
      } catch (err) {
        console.error("[USSD Balance Error]", err.message);
        response =
          `END Palibe. Yesaninso.\n` +
          `Could not fetch balance.\n` +
          `Please try again.`;
      }

      // ────────────────────────────────────────────────────────
      // INVALID OPTION
      // ────────────────────────────────────────────────────────
    } else {
      response =
        `END Sankhani yolondola 1-4.\n` + `Invalid option. Choose 1 to 4.`;
    }
  } catch (error) {
    console.error("[USSD Fatal Error]", error.message);
    response =
      `END Pali vuto. Yesaninso.\n` +
      `System error. Please try again.\n` +
      `Mukhoza kulowesa kachiwiri.`;
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
});

module.exports = router;
