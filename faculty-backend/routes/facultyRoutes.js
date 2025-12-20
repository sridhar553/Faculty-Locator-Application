const express = require("express");
const router = express.Router();
const Faculty = require("../models/Faculty");

// GET all faculty (Student)
router.get("/", async (req, res) => {
  try {
    const faculty = await Faculty.find();
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD faculty (Admin)
router.post("/", async (req, res) => {
  try {
    const faculty = new Faculty(req.body);
    await faculty.save();
    res.json({ message: "Faculty added successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE live status (Faculty)
router.put("/:id", async (req, res) => {
  try {
    await Faculty.updateOne(
      { id: req.params.id },
      { liveStatus: req.body }
    );
    res.json({ message: "Status updated successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE faculty (Admin)
router.delete("/:id", async (req, res) => {
  try {
    await Faculty.deleteOne({ id: req.params.id });
    res.json({ message: "Faculty deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

