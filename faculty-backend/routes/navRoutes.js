const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const isAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    next();
};

// GET all navigation links
router.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase.from('NavigationLinks').select('*').order('orderIndex', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST add new navigation link
router.post("/", isAdmin, async (req, res) => {
    const { label, url, orderIndex } = req.body;
    try {
        const { data, error } = await supabase.from('NavigationLinks').insert([
            { label, url, orderIndex: orderIndex || 0, createdAt: new Date() }
        ]).select();
        
        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update a navigation link
router.put("/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { label, url, orderIndex } = req.body;
    try {
        const { data, error } = await supabase.from('NavigationLinks')
            .update({ label, url, orderIndex })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a navigation link
router.delete("/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase.from('NavigationLinks').delete().eq('id', id);
        if (error) throw error;
        res.json({ message: "Navigation link deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
