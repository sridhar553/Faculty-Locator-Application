const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware to verify admin token (simple role check for now)
const isAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    next();
};

// GET all departments
router.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase.from('Departments').select('*').order('createdAt', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add new department
router.post("/", isAdmin, async (req, res) => {
    const { name, imageUrl } = req.body;
    try {
        const { data, error } = await supabase.from('Departments').insert([
            { name, imageUrl, createdAt: new Date() }
        ]).select();
        
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a department
router.delete("/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('Departments').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: "Department deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
