const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const { auth, isAdmin } = require("../middleware/auth");

// Get all system configs
router.get("/", async (req, res) => {
    try {
        const configs = await prisma.systemConfig.findMany();
        res.json(configs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update or set system config (Admin only)
router.post("/", auth, isAdmin, async (req, res) => {
    const { key, value } = req.body;
    try {
        const config = await prisma.systemConfig.upsert({
            where: { key },
            update: { value, updatedBy: req.user.id || "admin", updatedAt: new Date() },
            create: { key, value, updatedBy: req.user.id || "admin" }
        });

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
        const logs = await prisma.auditLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
