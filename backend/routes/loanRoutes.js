const express = require("express");
const router = express.Router();
const {
  requestLoan,
  approveLoan,
  rejectLoan,
} = require("../controllers/loanController");

router.post("/request", requestLoan);
router.patch("/approve/:id", approveLoan);
router.post("/reject", rejectLoan); // ← previously SMS route, now clean

module.exports = router;
