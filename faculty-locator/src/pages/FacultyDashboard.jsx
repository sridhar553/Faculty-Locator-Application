import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

// College coordinates are now loaded dynamically from Admin Panel settings

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [faculty, setFaculty] = useState(null);
  const [availability, setAvailability] = useState("Available");
  const [location, setLocation] = useState("");
  const [examMode, setExamMode] = useState(false);
  const [campusLocations, setCampusLocations] = useState([]);
  const [activeTab, setActiveTab] = useState("broadcast");
  const [profileForm, setProfileForm] = useState({ bio: "", phone: "", qualification: "", experience: "", photo: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Geolocation & Attendance State
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [distanceFromCollege, setDistanceFromCollege] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myLogs, setMyLogs] = useState([]);

  // Dynamic Geofence Config from Admin Panel
  const [collegeLat, setCollegeLat] = useState(null);
  const [collegeLng, setCollegeLng] = useState(null);
  const [maxRadius, setMaxRadius] = useState(500);

  // Signature Pad Ref
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const socket = useSocket();

  useEffect(() => {
    fetch("/api/faculty")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const f = data.find(x => x.id === user.id);
          if (!f) {
            alert("Faculty profile not found");
            return;
          }
          setFaculty(f);
          setAvailability(f.liveStatus?.availability || "Available");
          setLocation(f.liveStatus?.location || "");
          setProfileForm({
            bio: f.bio || "",
            phone: f.phone || "",
            qualification: f.qualification || "",
            experience: f.experience || "",
            photo: f.photo || ""
          });
        }
      })
      .catch(err => console.error(err));

    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mode = data.find(c => c.key === "examMode")?.value;
          setExamMode(!!mode);
          const lat = data.find(c => c.key === "collegeLatitude")?.value;
          const lng = data.find(c => c.key === "collegeLongitude")?.value;
          const rad = data.find(c => c.key === "geofenceRadius")?.value;
          if (lat) setCollegeLat(parseFloat(lat));
          if (lng) setCollegeLng(parseFloat(lng));
          if (rad) setMaxRadius(Number(rad));
        }
      })
      .catch(err => console.error(err));

    fetch("/api/locations")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCampusLocations(data); })
      .catch(err => console.error(err));

    loadMyLogs();
  }, [user.id]);

  function loadMyLogs() {
    fetch("/api/faculty/attendance/me", {
      headers: { "Authorization": `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMyLogs(data);
      })
      .catch(err => console.error(err));
  }

  useEffect(() => {
    if (!socket) return;
    socket.on("configUpdate", ({ key, value }) => {
      if (key === "examMode") {
        setExamMode(value);
        if (value) toast.error("EXAM MODE ENABLED! Please update your status frequently.");
      }
    });
    return () => socket.off("configUpdate");
  }, [socket]);

  // Haversine formula to calculate distance between two lat/lng points in meters
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.floor(R * c);
  }

  function fetchGPSLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    if (!collegeLat || !collegeLng) {
      toast.error("College location not configured yet. Ask your admin to set it.");
      return;
    }

    setIsLocating(true);
    toast.loading("Fetching GPS coordinates...", { id: "gps" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        
        const dist = calculateDistance(latitude, longitude, collegeLat, collegeLng);
        setDistanceFromCollege(dist);

        // Smart location matching: find nearest campus location within 100m
        let matchedName = null;
        let closestDist = Infinity;
        campusLocations.forEach(loc => {
          if (loc.lat && loc.lng) {
            const d = calculateDistance(latitude, longitude, loc.lat, loc.lng);
            if (d < closestDist) {
              closestDist = d;
              matchedName = `${loc.block}, ${loc.floor}, Cabin ${loc.cabinNo}`;
            }
          }
        });

        if (matchedName && closestDist <= 100) {
          setLocation(matchedName);
          toast.success(`📍 Matched: ${matchedName} (${dist}m from college)`, { id: "gps" });
        } else {
          setLocation(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          toast.success(`Location acquired! (${dist}m from college)`, { id: "gps" });
        }

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        toast.error("Failed to get location. Please allow permissions.", { id: "gps" });
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function updateStatus() {
    fetch(`/api/faculty/status/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({
        availability,
        location,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    })
      .then(async res => {
        if (res.ok) {
          toast.success("Live status synced with students!");
        } else {
          const data = await res.json();
          toast.error(data.message || "Error updating status");
        }
      })
      .catch(err => console.error(err));
  }

  // Signature Pad Logic
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = ((e.clientX || e.touches?.[0].clientX) - rect.left) * scaleX;
    const y = ((e.clientY || e.touches?.[0].clientY) - rect.top) * scaleY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // Prevent scrolling on touch
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = ((e.clientX || e.touches?.[0].clientX) - rect.left) * scaleX;
    const y = ((e.clientY || e.touches?.[0].clientY) - rect.top) * scaleY;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  function submitAttendance(type) {
    if (distanceFromCollege > maxRadius) {
      toast.error(`You are ${distanceFromCollege}m away! Must be within ${maxRadius}m.`);
      return;
    }
    if (!hasSignature) {
      toast.error("Please provide your digital signature.");
      return;
    }

    setIsSubmitting(true);
    const signatureData = canvasRef.current.toDataURL("image/png");

    fetch(`/api/faculty/attendance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token}`
      },
      body: JSON.stringify({
        type, // 'CHECK_IN' or 'CHECK_OUT'
        facultyId: user.id,
        gps: gpsCoords,
        signature: signatureData
      })
    })
      .then(async res => {
        setIsSubmitting(false);
        if (res.ok) {
          const actionText = type === 'CHECK_IN' ? 'Checked In' : 'Checked Out';
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          toast.success(`${actionText} at ${timeStr}`, { duration: 3000 });
          clearSignature();
          loadMyLogs();
        } else {
          let errMessage = "Unknown Error";
          try {
            const errData = await res.json();
            errMessage = errData.error || errData.message || JSON.stringify(errData);
          } catch(e) {
             errMessage = "Failed to parse error response";
          }
          toast.error(`Error ${res.status}: ${errMessage}`);
        }
      })
      .catch(err => {
        setIsSubmitting(false);
        toast.error("Network error");
        console.error(err);
      });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Photo must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setProfileForm(prev => ({ ...prev, photo: ev.target.result }));
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    setIsSavingProfile(true);
    fetch("/api/faculty/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${user.token}` },
      body: JSON.stringify(profileForm)
    })
      .then(async res => {
        setIsSavingProfile(false);
        if (res.ok) {
          toast.success("Profile saved successfully!");
        } else {
          const d = await res.json();
          toast.error(d.error || "Failed to save profile");
        }
      })
      .catch(() => { setIsSavingProfile(false); toast.error("Network error"); });
  }

  if (!faculty) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <div className="loader" style={{ width: '40px', height: '40px', border: '4px solid #cbd5e1', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const isWithinRange = distanceFromCollege !== null && distanceFromCollege <= maxRadius;

  const tabBtn = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '10px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600',
        fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
        background: activeTab === id ? '#4f46e5' : '#f1f5f9',
        color: activeTab === id ? '#fff' : '#475569',
        boxShadow: activeTab === id ? '0 4px 12px rgba(79,70,229,0.3)' : 'none'
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );

  return (
    <div className="faculty-dashboard-wrap">
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {examMode && (
        <div style={{ background: "linear-gradient(to right, #ef4444, #f97316)", color: "white", padding: "14px 20px", borderRadius: "12px", marginBottom: "20px", fontWeight: "600", display: 'flex', alignItems: 'center', gap: '10px' }}>
          ⚠️ Exam Mode is Active. Strict location tracking is enforced.
        </div>
      )}

      {/* Header */}
      <div className="fd-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div className="fd-header-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {profileForm.photo ? (
            <img src={profileForm.photo} alt="avatar" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e0e7ff', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '1.4rem', flexShrink: 0 }}>
              {faculty.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '1.6rem' }}>Welcome, {faculty.name.split(' ')[0]}</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>{faculty.department} | {faculty.subject}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="fd-signout-btn"
          style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: '600', flexShrink: 0 }}
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="fd-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {tabBtn("broadcast", "Student Broadcast", "📡")}
        {tabBtn("attendance", "Daily Attendance", "✅")}
        {tabBtn("profile", "My Profile", "👤")}
      </div>

      {/* TAB: BROADCAST */}
      {activeTab === "broadcast" && (
        <div className="fd-tab-panel" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Availability</label>
            <div style={{ position: 'relative' }}>
              <select
                value={availability}
                onChange={e => setAvailability(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: `2px solid ${availability === 'Available' ? '#22c55e' : availability === 'Busy' ? '#eab308' : '#ef4444'}`, background: `${availability === 'Available' ? '#f0fdf4' : availability === 'Busy' ? '#fefce8' : '#fef2f2'}`, color: '#1e293b', fontSize: '1rem', fontWeight: '600', appearance: 'none', cursor: 'pointer', transition: 'all 0.3s', boxSizing: 'border-box' }}
              >
                <option value="Available">🟢 Available to Students</option>
                <option value="Busy">🟡 Busy / In Class</option>
                <option value="Offline">🔴 Offline / Do Not Disturb</option>
              </select>
            </div>
          </div>

          {availability === 'Available' && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <label style={{ color: '#475569', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Location</label>
                <button onClick={fetchGPSLocation} disabled={isLocating} style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>
                  🌐 {isLocating ? "Fetching..." : "Auto-Locate"}
                </button>
              </div>
              <select
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', color: '#1e293b', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">-- Select a Location --</option>
                {campusLocations.map(loc => {
                  const label = `${loc.block}, ${loc.floor}, Cabin ${loc.cabinNo}`;
                  return <option key={loc.id} value={label}>{label}</option>;
                })}
                {location && !campusLocations.some(loc => `${loc.block}, ${loc.floor}, Cabin ${loc.cabinNo}` === location) && (
                  <option value={location}>{location}</option>
                )}
              </select>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>Default: {faculty.timetableLocation}</p>
            </div>
          )}

          <button
            onClick={updateStatus}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#4f46e5', color: 'white', border: 'none', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79,70,229,0.2)' }}
          >
            Broadcast Update
          </button>
        </div>
      )}

      {/* TAB: ATTENDANCE */}
      {activeTab === "attendance" && (
        <div className="fd-tab-panel" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', animation: 'fadeIn 0.3s ease' }}>
          {/* Geofence Status */}
          <div style={{ background: distanceFromCollege === null ? '#f8fafc' : isWithinRange ? '#f0fdf4' : '#fef2f2', border: `1px solid ${distanceFromCollege === null ? '#e2e8f0' : isWithinRange ? '#bbf7d0' : '#fecaca'}`, padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Geofence Status</p>
              <button onClick={fetchGPSLocation} disabled={isLocating} style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: '600', fontSize: '0.75rem', cursor: 'pointer' }}>
                🔄 {isLocating ? "Fetching..." : "Fetch GPS"}
              </button>
            </div>
            {distanceFromCollege === null ? (
              <p style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }}></span> Waiting for GPS location...</p>
            ) : isWithinRange ? (
              <p style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></span> Inside Campus ({distanceFromCollege}m)</p>
            ) : (
              <p style={{ margin: 0, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Too Far ({distanceFromCollege}m) - Check-in Locked</p>
            )}
          </div>

          {/* Digital Signature */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ color: '#475569', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Digital Signature Required</label>
              <button onClick={clearSignature} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>Clear</button>
            </div>
            <div style={{ position: 'relative', borderRadius: '12px', border: '2px dashed #cbd5e1', background: '#f8fafc', overflow: 'hidden', opacity: isWithinRange ? 1 : 0.5, pointerEvents: isWithinRange ? 'auto' : 'none' }}>
              {!hasSignature && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#94a3b8', pointerEvents: 'none' }}>Sign here</div>
              )}
              <canvas ref={canvasRef} width={400} height={150} style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
                onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
              />
            </div>
          </div>

          <div className="fd-action-btns" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <button disabled={!isWithinRange || !hasSignature || isSubmitting} onClick={() => submitAttendance('CHECK_IN')}
              style={{ flex: 1, padding: '14px', borderRadius: '12px', background: (!isWithinRange || !hasSignature) ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', fontSize: '1rem', fontWeight: '600', cursor: (!isWithinRange || !hasSignature) ? 'not-allowed' : 'pointer' }}
            >Check-In</button>
            <button disabled={!isWithinRange || !hasSignature || isSubmitting} onClick={() => submitAttendance('CHECK_OUT')}
              style={{ flex: 1, padding: '14px', borderRadius: '12px', background: (!isWithinRange || !hasSignature) ? '#cbd5e1' : '#f59e0b', color: 'white', border: 'none', fontSize: '1rem', fontWeight: '600', cursor: (!isWithinRange || !hasSignature) ? 'not-allowed' : 'pointer' }}
            >Check-Out</button>
          </div>
          <p style={{ margin: '0 0 24px 0', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>Administrators monitor all GPS-verified check-ins to prevent proxy attendance.</p>

        </div>
      )}

      {/* TAB: PROFILE */}
      {activeTab === "profile" && (
        <div className="fd-tab-panel" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', animation: 'fadeIn 0.3s ease' }}>
          {/* Photo Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative' }}>
              {profileForm.photo ? (
                <img src={profileForm.photo} alt="profile" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e0e7ff' }} />
              ) : (
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '2rem' }}>
                  {faculty.name.charAt(0)}
                </div>
              )}
              <label htmlFor="photo-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: '#4f46e5', color: '#fff', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem', border: '2px solid #fff' }}>✏️</label>
              <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>{faculty.name}</h3>
              <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '0.9rem' }}>{faculty.department} · {faculty.subject}</p>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.78rem' }}>ID: {faculty.id}</p>
            </div>
          </div>

          {/* Professional Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: '600', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Short Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={e => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Write a short introduction about yourself..."
                rows={3}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div className="fd-profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: '600', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</label>
                <input type="tel" value={profileForm.phone} onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="e.g. +91 9876543210"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.95rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: '600', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Years of Experience</label>
                <input type="number" value={profileForm.experience} onChange={e => setProfileForm(prev => ({ ...prev, experience: e.target.value }))} placeholder="e.g. 8"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.95rem', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: '600', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Highest Qualification</label>
              <input type="text" value={profileForm.qualification} onChange={e => setProfileForm(prev => ({ ...prev, qualification: e.target.value }))} placeholder="e.g. Ph.D. in Computer Science"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.95rem', boxSizing: 'border-box' }} />
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={isSavingProfile}
            style={{ width: '100%', marginTop: '24px', padding: '14px', borderRadius: '12px', background: isSavingProfile ? '#a5b4fc' : '#4f46e5', color: 'white', border: 'none', fontSize: '1rem', fontWeight: '600', cursor: isSavingProfile ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
          >
            {isSavingProfile ? "Saving..." : "💾 Save Profile"}
          </button>
        </div>
      )}
    </div>
  );
}



