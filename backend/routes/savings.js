const express = require("express");
const router = express.Router();
const savingsController = require("../controllers/savingsController");

router.get("/balance/:address", savingsController.getBalanceForAPI);
router.post("/deposit", savingsController.deposit);
router.post("/borrow", savingsController.borrow);
router.post("/repay", savingsController.repay);

module.exports = router;
