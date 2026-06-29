const express = require("express");
const router = express.Router();
const Faculty = require("../models/Faculty");
const AuditLog = require("../models/AuditLog");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { auth, isAdmin, isFaculty } = require("../middleware/auth");

// GET all faculty (Student & Admin) - Public
router.get("/", async (req, res) => {
  try {
    const faculty = await Faculty.find({}, { password: 0 }); // Exclude passwords
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD faculty (Admin only)
router.post("/", auth, isAdmin, async (req, res) => {
  try {
    const { id, password } = req.body;

    const existingFaculty = await Faculty.findOne({ id });
    if (existingFaculty) {
      return res.status(400).json({ message: "Faculty with this ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const faculty = new Faculty({
      ...req.body,
      password: hashedPassword,
      role: "faculty"
    });

    await faculty.save();
    res.json({ message: "Faculty added successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE live status (Faculty only)
router.put("/status/:id", auth, isFaculty, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ message: "You can only update your own status" });
    }

    const faculty = await Faculty.findOne({ id: req.params.id });
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const oldStatus = faculty.liveStatus;
    const { availability, location, updatedAt } = req.body;

    await Faculty.updateOne(
      { id: req.params.id },
      {
        liveStatus: {
          availability,
          location,
          updatedAt
        }
      }
    );

    // AUDIT LOG
    const log = new AuditLog({
      facultyId: faculty.id,
      facultyName: faculty.name,
      action: "STATUS_UPDATE",
      details: {
        previous: oldStatus,
        current: { availability, location, updatedAt }
      }
    });
    await log.save();

    // SOCKET EMIT
    req.io.emit("statusUpdate", {
      id: faculty.id,
      liveStatus: { availability, location, updatedAt }
    });

    res.json({ message: "Status updated successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE faculty (Admin only)
router.delete("/:id", auth, isAdmin, async (req, res) => {
  try {
    await Faculty.deleteOne({ id: req.params.id });
    res.json({ message: "Faculty deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

