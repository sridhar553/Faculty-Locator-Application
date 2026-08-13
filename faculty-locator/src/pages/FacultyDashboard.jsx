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
  
  // Geolocation & Attendance State
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [distanceFromCollege, setDistanceFromCollege] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, [user.id]);

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
        setLocation(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        
        const dist = calculateDistance(latitude, longitude, collegeLat, collegeLng);
        setDistanceFromCollege(dist);
        
        setIsLocating(false);
        toast.success(`Location acquired! (${dist}m from college)`, { id: "gps" });
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
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    
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
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
    
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
    if (distanceFromCollege > MAX_RADIUS_METERS) {
      toast.error(`You are ${distanceFromCollege}m away! Must be within ${MAX_RADIUS_METERS}m.`);
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
          toast.success(`Successfully ${type === 'CHECK_IN' ? 'Checked In' : 'Checked Out'}!`);
          clearSignature();
        } else {
          toast.error("Failed to record attendance");
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

  if (!faculty) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
      <div className="loader" style={{ width: '40px', height: '40px', border: '4px solid #cbd5e1', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const isWithinRange = distanceFromCollege !== null && distanceFromCollege <= maxRadius;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      {examMode && (
        <div style={{ background: "linear-gradient(to right, #ef4444, #f97316)", color: "white", padding: "16px", borderRadius: "12px", marginBottom: "24px", fontWeight: "600", display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          Exam Mode is Active. Strict location tracking is enforced.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '2rem' }}>Welcome, {faculty.name.split(' ')[0]}</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem' }}>{faculty.department} | {faculty.subject}</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 20px', borderRadius: '50px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* SECTION 1: LIVE STATUS */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: '#e0e7ff', padding: '10px', borderRadius: '12px', color: '#4f46e5' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem' }}>Student Broadcast</h2>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: '500', fontSize: '0.9rem' }}>Current Availability</label>
            <div style={{ position: 'relative' }}>
              <select
                value={availability}
                onChange={e => setAvailability(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: `2px solid ${availability === 'Available' ? '#22c55e' : availability === 'Busy' ? '#eab308' : '#ef4444'}`,
                  background: `${availability === 'Available' ? '#f0fdf4' : availability === 'Busy' ? '#fefce8' : '#fef2f2'}`,
                  color: '#1e293b',
                  fontSize: '1rem',
                  fontWeight: '600',
                  appearance: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <option value="Available">🟢 Available to Students</option>
                <option value="Busy">🟡 Busy / In Class</option>
                <option value="Offline">🔴 Offline / Do Not Disturb</option>
              </select>
              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <label style={{ color: '#475569', fontWeight: '500', fontSize: '0.9rem' }}>Live Location</label>
              <button 
                onClick={fetchGPSLocation}
                disabled={isLocating}
                style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                {isLocating ? "Fetching..." : "Auto-Locate"}
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. CS Block Lab 2"
              value={location}
              onChange={e => setLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '1rem',
                color: '#1e293b',
                boxSizing: 'border-box'
              }}
            />
            <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>Default: {faculty.timetableLocation}</p>
          </div>

          <button 
            onClick={updateStatus}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#4338ca'}
            onMouseOut={(e) => e.currentTarget.style.background = '#4f46e5'}
          >
            Broadcast Update
          </button>
        </div>

        {/* SECTION 2: GEOFENCED ATTENDANCE */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '12px', color: '#d97706' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.4rem' }}>Daily Attendance</h2>
          </div>

          {/* Distance Indicator */}
          <div style={{ 
            background: distanceFromCollege === null ? '#f8fafc' : isWithinRange ? '#f0fdf4' : '#fef2f2', 
            border: `1px solid ${distanceFromCollege === null ? '#e2e8f0' : isWithinRange ? '#bbf7d0' : '#fecaca'}`,
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '20px'
          }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Geofence Status</p>
            {distanceFromCollege === null ? (
              <p style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }}></span>
                Waiting for GPS location...
              </p>
            ) : isWithinRange ? (
              <p style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></span>
                Inside Campus ({distanceFromCollege}m)
              </p>
            ) : (
              <p style={{ margin: 0, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
                Too Far ({distanceFromCollege}m) - Check-in Locked
              </p>
            )}
          </div>

          {/* Digital Signature */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <label style={{ color: '#475569', fontWeight: '500', fontSize: '0.9rem' }}>Digital Signature Required</label>
              <button 
                onClick={clearSignature}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
              >
                Clear
              </button>
            </div>
            
            <div style={{ 
              position: 'relative', 
              borderRadius: '12px', 
              border: '2px dashed #cbd5e1', 
              background: '#f8fafc',
              overflow: 'hidden',
              opacity: isWithinRange ? 1 : 0.5,
              pointerEvents: isWithinRange ? 'auto' : 'none',
              transition: 'all 0.3s'
            }}>
              {!hasSignature && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#94a3b8', pointerEvents: 'none', userSelect: 'none' }}>
                  Sign here
                </div>
              )}
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              disabled={!isWithinRange || !hasSignature || isSubmitting}
              onClick={() => submitAttendance('CHECK_IN')}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                background: (!isWithinRange || !hasSignature) ? '#cbd5e1' : '#10b981',
                color: 'white',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: (!isWithinRange || !hasSignature) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Check-In
            </button>
            <button
              disabled={!isWithinRange || !hasSignature || isSubmitting}
              onClick={() => submitAttendance('CHECK_OUT')}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '12px',
                background: (!isWithinRange || !hasSignature) ? '#cbd5e1' : '#f59e0b',
                color: 'white',
                border: 'none',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: (!isWithinRange || !hasSignature) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Check-Out
            </button>
          </div>
          
          <p style={{ margin: '12px 0 0 0', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
            Administrators monitor all GPS-verified check-ins to prevent proxy attendance.
          </p>
        </div>

      </div>
    </div>
  );
}
