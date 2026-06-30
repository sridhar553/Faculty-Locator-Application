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
          <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; color: #333333; text-align: center;">
            <div style="background-color: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <h2 style="color: #0f172a; margin-top: 0; font-size: 24px;">Welcome, ${name}!</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">An administrator has created a Faculty Locator account for you.</p>
              
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 2px dashed #cbd5e1; display: inline-block; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #64748b; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your Auto-Generated Faculty ID</p>
                <div style="font-family: monospace; font-size: 28px; font-weight: bold; color: #4338ca; letter-spacing: 2px;">${id}</div>
              </div>
              
              <p style="color: #475569; font-size: 15px; margin-bottom: 30px;">You will need this ID to log in to the portal.</p>
              
              <a href="${setupUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Set My Password</a>
            </div>
            
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">This link expires in 24 hours.</p>
          </div>
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

