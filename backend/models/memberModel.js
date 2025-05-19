const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  firstName: String,
  surname: String,
  gender: String,
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  ethAddress: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Member", memberSchema);
