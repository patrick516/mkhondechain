const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema({
  action: String,
  performedBy: String,
  targetMember: String,
  details: Object,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Audit", auditSchema);
