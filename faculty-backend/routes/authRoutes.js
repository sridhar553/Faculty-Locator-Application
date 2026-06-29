const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Admin Login
router.post("/admin/login", async (req, res) => {
    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign(
            { role: "admin" },
            process.env.JWT_SECRET || "SECRET_KEY",
            { expiresIn: "24h" }
        );
        return res.json({ token, role: "admin" });
    }

    res.status(401).json({ message: "Invalid admin password" });
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
