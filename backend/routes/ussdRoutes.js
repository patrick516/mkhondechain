const express = require("express");
const router = express.Router();
const savingsController = require("../controllers/savingsController");
const userService = require("../services/userService");
const sendSms = require("../utils/africasTalkingSms");
const { ethers } = require("ethers");
const Member = require("../models/memberModel");

router.post("/", async (req, res) => {
  console.log("USSD request received!");
  console.log("Request raw body:", req.body);

  const { sessionId, serviceCode, phoneNumber, text } = req.body;
  let response = "";
  const input = text.split("*");
  const level = input.length;

  const formatMK = (amountEth) =>
    `MK${parseFloat(amountEth * 1000).toLocaleString()}`;

  try {
    const ethAddress = await userService.getWalletAddressByPhone(phoneNumber);
    const member = await Member.findOne({ phone: phoneNumber });

    if (!member || !ethAddress) {
      response = `END You are not registered in the system. Contact your group leader.`;
      res.set("Content-Type", "text/plain");
      return res.send(response);
    }

    // MAIN MENU
    if (text === "") {
      response = `CON Welcome to MkhondeChain\n1. Save Money\n2. Borrow Money\n3. View Balance`;

      // SAVE MONEY
    } else if (input[0] === "1") {
      if (level === 1) {
        response = `CON Enter amount to save (e.g. 2000):`;
      } else if (level === 2) {
        const amount = parseInt(input[1]);
        if (isNaN(amount) || amount <= 0) {
          response = `END Invalid input. Enter a number like 2000.`;
        } else {
          response = `CON Enter your Airtel/Mpamba PIN:`; // Mocked
        }
      } else if (level === 3) {
        const amount = parseInt(input[1]);
        const pin = input[2];

        if (!pin || pin.length < 4) {
          response = `END Invalid PIN. Please try again.`;
        } else {
          try {
            await savingsController.depositViaUSSD(phoneNumber, amount, req);
            response = `END Payment successful. MK${amount.toLocaleString()} saved.`;
          } catch (err) {
            console.error("depositViaUSSD error:", err.message);
            response = `END Deposit failed: ${err.message}`;
          }
        }
      }

      // BORROW MONEY
    } else if (input[0] === "2") {
      if (level === 1) {
        response = `CON Select amount to borrow:\n1. MK1,000\n2. MK2,000\n3. MK3,000\n10. Other`;
      } else if (level === 2 && ["1", "2", "3"].includes(input[1])) {
        const map = { 1: 1000, 2: 2000, 3: 3000 };
        const borrowAmount = map[input[1]];

        const canBorrow = await savingsController.canBorrow(
          phoneNumber,
          borrowAmount
        );

        if (!canBorrow) {
          await sendSms(
            phoneNumber,
            `Loan request declined: You are not eligible to borrow MK${borrowAmount.toLocaleString()}.\nSave more first.`
          );
          response = `END Loan request declined.\nReason: Save more first.`;
        } else {
          await savingsController.requestLoan(phoneNumber, borrowAmount, req);
          const loan = await savingsController.sendLoanToMobile(
            phoneNumber,
            borrowAmount
          );

          if (loan.entries && loan.entries[0].status === "Queued") {
            response = `END Loan of ${formatMK(
              borrowAmount / 1000
            )} sent to your wallet.`;
          } else {
            response = `END Loan failed. Please try again later.`;
          }
        }
      } else if (level === 2 && input[1] === "10") {
        response = `CON Enter custom amount (e.g. 1500):`;
      } else if (level === 3 && input[1] === "10") {
        const customAmount = parseInt(input[2]);
        if (isNaN(customAmount) || customAmount <= 0) {
          response = `END Invalid amount. Enter a valid number.`;
        } else {
          const canBorrow = await savingsController.canBorrow(
            phoneNumber,
            customAmount
          );

          if (!canBorrow) {
            await sendSms(
              phoneNumber,
              `Loan declined: You cannot borrow MK${customAmount.toLocaleString()}.\nSave more first.`
            );
            response = `END Loan request declined.\nReason: Not eligible yet.`;
          } else {
            await savingsController.requestLoan(phoneNumber, customAmount, req);
            const loan = await savingsController.sendLoanToMobile(
              phoneNumber,
              customAmount
            );

            if (loan.entries && loan.entries[0].status === "Queued") {
              response = `END Loan of ${formatMK(
                customAmount / 1000
              )} sent to your wallet.`;
            } else {
              response = `END Loan failed. Please try again later.`;
            }
          }
        }
      } else {
        response = `END Invalid selection. Try again.`;
      }

      // VIEW BALANCE
    } else if (input[0] === "3") {
      const { totalSaved, loanAmount, eligibleToBorrow } =
        await savingsController.getBalanceForUSSD(phoneNumber);

      response = `END 💼 Account Summary:
💰 Saved: ${formatMK(totalSaved)}
💳 Loan: ${formatMK(loanAmount)}
✅ Can Borrow: ${formatMK(eligibleToBorrow)}`;

      // INVALID OPTION
    } else {
      response = `END Invalid option. Please try again.`;
    }
  } catch (error) {
    console.error("USSD Error:", error.message);
    response = `END An error occurred. Please try again later.`;
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
});

module.exports = router;
