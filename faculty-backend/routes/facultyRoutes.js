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
    const { name, email, department, subject, timetableLocation } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Auto-generate ID based on department
    let prefix = "FAC";
    if (department && department.trim() !== "") {
      const words = department.trim().split(/[\s&]+/);
      if (words.length > 1) {
        prefix = words.map(w => w[0].toUpperCase()).join("");
      } else {
        prefix = department.substring(0, 3).toUpperCase();
      }
    }
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 digit
    const id = `${prefix}-${randomNum}`;

    const { data: existingFaculty, error: checkError } = await supabase.from('Faculty').select('id').eq('id', id).maybeSingle();
    if (checkError) throw checkError;
    if (existingFaculty) {
      // In the extremely rare case of collision, just fail and they can retry
      return res.status(400).json({ message: "ID collision occurred. Please try again." });
    }

    // Generate secure token
    const crypto = require("crypto");
    const setupToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const { error: createError } = await supabase.from('Faculty').insert([{
        id,
        name,
        email,
        department,
        subject,
        timetableLocation,
        password: null,
        role: "faculty",
        setupToken,
        tokenExpiry
    }]);
    if (createError) throw createError;

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const setupUrl = `https://faculty-locator-application.onrender.com/faculty-setup?token=${setupToken}`;

      await resend.emails.send({
        from: "Admin <onboarding@resend.dev>",
        to: email,
        subject: "Welcome! Set up your Faculty Account",
        html: `
          <h2>Welcome to the Faculty Locator, ${name}!</h2>
          <p>An administrator has created an account for you.</p>
          <p style="padding: 10px; background: #f1f5f9; border-radius: 5px;">
            <strong>Your Auto-Generated Faculty ID is:</strong> <span style="font-family: monospace; font-size: 1.2em;">${id}</span>
          </p>
          <p>You will need this ID to log in.</p>
          <p>Please click the link below to set your password and access your dashboard:</p>
          <a href="${setupUrl}" style="padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Set My Password</a>
          <p style="margin-top: 20px; font-size: 0.8em; color: #666;">This link expires in 24 hours.</p>
        `
      });
    } else {
       console.warn("RESEND_API_KEY is missing. Email not sent. Token is:", setupToken);
    }

    res.json({ message: "Faculty added and invitation sent successfully" });
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

