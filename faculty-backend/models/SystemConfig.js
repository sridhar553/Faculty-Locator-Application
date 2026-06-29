const mongoose = require("mongoose");

const SystemConfigSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed,
    updatedBy: String,
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SystemConfig", SystemConfigSchema);
