const express = require("express");
const router = express.Router();
const disputeController = require("../controllers/disputeController");

router.get("/", disputeController.listDisputes);
router.patch("/:disputeId/resolve", disputeController.resolveDispute);

module.exports = router;
