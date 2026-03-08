const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  surname: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ["Male", "Female"],
    required: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  ethAddress: {
    type: String,
    required: true,
    unique: true,
  },
  savingsCount: {
    type: Number,
    default: 0,
  },
  borrowCount: {
    type: Number,
    default: 0,
  },
  totalSaved: {
    type: Number,
    default: 0, // in MK
  },
  totalBorrowed: {
    type: Number,
    default: 0, // in MK
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Member", memberSchema);
