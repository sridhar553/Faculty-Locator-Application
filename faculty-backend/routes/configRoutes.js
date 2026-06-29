const express = require("express");
const router = express.Router();
const SystemConfig = require("../models/SystemConfig");
const AuditLog = require("../models/AuditLog");
const { auth, isAdmin } = require("../middleware/auth");

// Get all system configs
router.get("/", async (req, res) => {
    try {
        const configs = await SystemConfig.find();
        res.json(configs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update or set system config (Admin only)
router.post("/", auth, isAdmin, async (req, res) => {
    const { key, value } = req.body;
    try {
        const config = await SystemConfig.findOneAndUpdate(
            { key },
            { value, updatedBy: req.user.id || "admin", updatedAt: Date.now() },
            { upsert: true, new: true }
        );

        // Notify all clients about config change
        req.io.emit("configUpdate", { key, value });

        res.json(config);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get audit logs (Admin only)
router.get("/logs", auth, isAdmin, async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
