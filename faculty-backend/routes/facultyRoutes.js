const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { auth, isAdmin, isFaculty } = require("../middleware/auth");

// GET all faculty (Student & Admin) - Public
router.get("/", async (req, res) => {
  try {
    const faculties = await prisma.faculty.findMany();
    const mapped = faculties.map(f => ({
      id: f.id,
      name: f.name,
      department: f.department,
      subject: f.subject,
      timetableLocation: f.timetableLocation,
      role: f.role,
      liveStatus: {
        availability: f.liveStatusAvailability,
        location: f.liveStatusLocation,
        updatedAt: f.liveStatusUpdatedAt
      }
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD faculty (Admin only)
router.post("/", auth, isAdmin, async (req, res) => {
  try {
    const { id, password } = req.body;

    const existingFaculty = await prisma.faculty.findUnique({ where: { id } });
    if (existingFaculty) {
      return res.status(400).json({ message: "Faculty with this ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.faculty.create({
      data: {
        id,
        name: req.body.name,
        department: req.body.department,
        subject: req.body.subject,
        timetableLocation: req.body.timetableLocation,
        password: hashedPassword,
        role: "faculty"
      }
    });
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

    const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const oldStatus = {
      availability: faculty.liveStatusAvailability,
      location: faculty.liveStatusLocation,
      updatedAt: faculty.liveStatusUpdatedAt
    };
    const { availability, location, updatedAt } = req.body;

    await prisma.faculty.update({
      where: { id: req.params.id },
      data: {
        liveStatusAvailability: availability,
        liveStatusLocation: location,
        liveStatusUpdatedAt: String(updatedAt)
      }
    });

    // AUDIT LOG
    await prisma.auditLog.create({
      data: {
        facultyId: faculty.id,
        facultyName: faculty.name,
        action: "STATUS_UPDATE",
        details: {
          previous: oldStatus,
          current: { availability, location, updatedAt }
        }
      }
    });

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
    await prisma.faculty.delete({ where: { id: req.params.id } });
    res.json({ message: "Faculty deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

