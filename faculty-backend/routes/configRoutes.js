const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const { auth, isAdmin } = require("../middleware/auth");

// Get all system configs
router.get("/", async (req, res) => {
    try {
        const { data: configs, error } = await supabase.from('SystemConfig').select('*');
        if (error) throw error;
        res.json(configs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update or set system config (Admin only)
router.post("/", auth, isAdmin, async (req, res) => {
    const { key, value } = req.body;
    try {
        const { data: config, error } = await supabase.from('SystemConfig').upsert(
            { key, value, updatedBy: req.user.id || "admin", updatedAt: new Date() },
            { onConflict: 'key' }
        ).select().single();
        if (error) throw error;

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
        const { data: logs, error } = await supabase.from('AuditLog').select('*').order('timestamp', { ascending: false }).limit(100);
        if (error) throw error;
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
