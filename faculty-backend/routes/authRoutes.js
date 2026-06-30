const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Admin Status Check
router.get("/admin/status", async (req, res) => {
    try {
        const { data: config, error } = await supabase.from('SystemConfig').select('*').eq('key', 'adminPassword').single();
        if (error && error.code !== 'PGRST116') {
            return res.status(500).json({ error: error.message });
        }
        res.json({ isSetupNeeded: !config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Setup
router.post("/admin/setup", async (req, res) => {
    const { password } = req.body;
    try {
        const { data: existingConfig } = await supabase.from('SystemConfig').select('*').eq('key', 'adminPassword').single();
        
        if (existingConfig) {
            return res.status(400).json({ message: "Admin password already set up" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const { error: insertError } = await supabase.from('SystemConfig').insert([
            { key: 'adminPassword', value: hashedPassword, updatedBy: 'system', updatedAt: new Date() }
        ]);

        if (insertError) throw insertError;

        const token = jwt.sign(
            { role: "admin" },
            process.env.JWT_SECRET || "SECRET_KEY",
            { expiresIn: "24h" }
        );
        res.json({ token, role: "admin" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Login
router.post("/admin/login", async (req, res) => {
    const { password } = req.body;

    try {
        const { data: config, error } = await supabase.from('SystemConfig').select('*').eq('key', 'adminPassword').single();
        
        if (error || !config) {
            return res.status(404).json({ message: "Admin password not set up" });
        }

        const isMatch = await bcrypt.compare(password, config.value);
        if (isMatch) {
            const token = jwt.sign(
                { role: "admin" },
                process.env.JWT_SECRET || "SECRET_KEY",
                { expiresIn: "24h" }
            );
            return res.json({ token, role: "admin" });
        }
        
        res.status(401).json({ message: "Invalid admin password" });
    } catch (err) {
         res.status(500).json({ error: err.message });
    }
});

// Faculty Login
router.post("/faculty/login", async (req, res) => {
    const { id, password } = req.body;

    try {
        const { data: faculty, error } = await supabase.from('Faculty').select('*').eq('id', id).single();
        if (error || !faculty) {
            return res.status(404).json({ message: "Faculty not found" });
        }

        const isMatch = await bcrypt.compare(password, faculty.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: faculty.id, role: "faculty" },
            process.env.JWT_SECRET || "SECRET_KEY",
            { expiresIn: "24h" }
        );

        res.json({
            token,
            role: "faculty",
            name: faculty.name,
            id: faculty.id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
