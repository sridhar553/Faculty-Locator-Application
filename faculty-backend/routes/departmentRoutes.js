const express = require("express");
const router = express.Router();
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

// Setup multer to store file in memory
const upload = multer({ storage: multer.memoryStorage() });

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

// POST add new department with image upload
router.post("/", isAdmin, upload.single("image"), async (req, res) => {
    const { name } = req.body;
    const file = req.file;

    try {
        if (!name || !file) {
            return res.status(400).json({ message: "Name and image file are required" });
        }

        // Upload to Supabase Storage
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('department-images')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('department-images')
            .getPublicUrl(filePath);

        const imageUrl = urlData.publicUrl;

        // Insert into database
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
