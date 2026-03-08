const mongoose = require("mongoose");

const systemSettingSchema = new mongoose.Schema({
  savingWindowOpen: { type: Boolean, default: false },
  lastOpenedAt: { type: Date, default: null },
});

module.exports = mongoose.model("SystemSetting", systemSettingSchema);
