const express = require("express");
const router = express.Router();
const Faculty = require("../models/Faculty");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { auth, authorizeRole } = require("../middleware/auth");



// GET all faculty (Student)

// LOGIN faculty
router.post("/login", async (req, res) => {
  const { id, password } = req.body;

  const faculty = await Faculty.findOne({ id });
  if (!faculty) {
    return res.status(400).json({ message: "Faculty not found" });
  }

  const isMatch = await bcrypt.compare(password, faculty.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid password" });
  }

  const token = jwt.sign(
    { id: faculty.id, role: faculty.role },
    "SECRET_KEY",
    { expiresIn: "1h" }
  );

  res.json({
    token,
    role: faculty.role,
    name: faculty.name
  });
});


router.get("/", async (req, res) => {
  try {
    const faculty = await Faculty.find();
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD faculty (Admin only)
router.post("/", auth, authorizeRole("admin"), async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const faculty = new Faculty({
      ...req.body,
      password: hashedPassword
    });

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

