const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const { auth, isAdmin } = require("../middleware/auth");

// GET all locations - Public (needed for invite form and maybe students)
router.get("/", async (req, res) => {
  try {
    const { data: locations, error } = await supabase.from('Locations').select('*').order('block', { ascending: true });
    if (error) throw error;
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD location (Admin only)
router.post("/", auth, isAdmin, async (req, res) => {
  try {
    const { block, floor, cabinNo } = req.body;
    
    if (!block || !floor || !cabinNo) {
        return res.status(400).json({ message: "Block, floor, and cabin number are required" });
    }

    const { data, error } = await supabase.from('Locations').insert([
        { block, floor, cabinNo }
    ]).select();

    if (error) throw error;
    res.json({ message: "Location added successfully", location: data[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE location (Admin only)
router.delete("/:id", auth, isAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('Locations').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: "Location deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
