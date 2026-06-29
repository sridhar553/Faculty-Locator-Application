const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { auth, isAdmin, isFaculty } = require("../middleware/auth");

// GET all faculty (Student & Admin) - Public
router.get("/", async (req, res) => {
  try {
    const { data: faculties, error } = await supabase.from('Faculty').select('*');
    if (error) throw error;
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

    const { data: existingFaculty, error: checkError } = await supabase.from('Faculty').select('id').eq('id', id).maybeSingle();
    if (checkError) throw checkError;
    if (existingFaculty) {
      return res.status(400).json({ message: "Faculty with this ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { error: createError } = await supabase.from('Faculty').insert([{
        id,
        name: req.body.name,
        department: req.body.department,
        subject: req.body.subject,
        timetableLocation: req.body.timetableLocation,
        password: hashedPassword,
        role: "faculty"
    }]);
    if (createError) throw createError;
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

    const { data: faculty, error: checkError } = await supabase.from('Faculty').select('*').eq('id', req.params.id).maybeSingle();
    if (checkError) throw checkError;
    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const oldStatus = {
      availability: faculty.liveStatusAvailability,
      location: faculty.liveStatusLocation,
      updatedAt: faculty.liveStatusUpdatedAt
    };
    const { availability, location, updatedAt } = req.body;

    const { error: updateError } = await supabase.from('Faculty').update({
        liveStatusAvailability: availability,
        liveStatusLocation: location,
        liveStatusUpdatedAt: String(updatedAt)
    }).eq('id', req.params.id);
    if (updateError) throw updateError;

    // AUDIT LOG
    const { error: auditError } = await supabase.from('AuditLog').insert([{
        facultyId: faculty.id,
        facultyName: faculty.name,
        action: "STATUS_UPDATE",
        details: {
          previous: oldStatus,
          current: { availability, location, updatedAt }
        }
    }]);
    if (auditError) console.error("Audit log error:", auditError);

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
    const { error: deleteError } = await supabase.from('Faculty').delete().eq('id', req.params.id);
    if (deleteError) throw deleteError;
    res.json({ message: "Faculty deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

