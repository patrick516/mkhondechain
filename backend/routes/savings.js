const express = require("express");
const router = express.Router();
const savingsController = require("../controllers/savingsController");

router.post("/deposit", savingsController.deposit);
router.get("/balance/:address", savingsController.getBalance);
router.post("/borrow", savingsController.borrow);
router.post("/repay", savingsController.repay);

module.exports = router;
