const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
    facultyId: String,
    facultyName: String,
    action: String, // e.g., "STATUS_UPDATE", "LOCATION_UPDATE"
    details: {
        previous: mongoose.Schema.Types.Mixed,
        current: mongoose.Schema.Types.Mixed
    },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);
