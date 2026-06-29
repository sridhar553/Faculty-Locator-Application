import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [faculty, setFaculty] = useState(null);
  const [availability, setAvailability] = useState("Available");
  const [location, setLocation] = useState("");
  const [examMode, setExamMode] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/faculty`)
      .then(res => res.json())
      .then(data => {
        const f = data.find(x => x.id === user.id);
        if (!f) {
          alert("Faculty profile not found");
          return;
        }
        setFaculty(f);
        setAvailability(f.liveStatus?.availability || "Available");
        setLocation(f.liveStatus?.location || "");
      })
      .catch(err => console.error(err));

    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/config`)
      .then(res => res.json())
      .then(data => {
        const mode = data.find(c => c.key === "examMode")?.value;
        setExamMode(!!mode);
      });
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

  function updateStatus() {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/faculty/status/${user.id}`, {
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
          toast.success("Status updated and synced!");
        } else {
          const data = await res.json();
          toast.error(data.message || "Error updating status");
        }
      })
      .catch(err => console.error(err));
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!faculty) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      {examMode && (
        <div style={{ background: "#fff7ed", border: "1px solid #fb923c", color: "#9a3412", padding: "10px", borderRadius: "8px", marginBottom: "20px", fontWeight: "bold" }}>
          ⚠️ Exam Mode is ON. Please keep your location and availability updated for students.
        </div>
      )}

      <h1>Faculty Dashboard</h1>

      <div className="card">
        <h3>{faculty.name}</h3>
        <p>{faculty.department} | {faculty.subject}</p>
        <p style={{ color: "#666" }}>Default: {faculty.timetableLocation}</p>
      </div>

      <div className="card">
        <label>Availability Status</label>
        <select
          value={availability}
          onChange={e => setAvailability(e.target.value)}
          style={{
            borderColor: availability === "Available" ? "#22c55e" : availability === "Busy" ? "#eab308" : "#ef4444",
            borderWidth: "2px"
          }}
        >
          <option value="Available">Available (Green)</option>
          <option value="Busy">Busy (Yellow)</option>
          <option value="Offline">Offline (Red)</option>
        </select>

        <label>Live Location</label>
        <input
          placeholder="Example: CS Block Lab 2"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />

        <button className="primary" onClick={updateStatus} style={{ width: "100%", marginTop: "10px" }}>
          Broadast Status Update
        </button>

        <button
          style={{ background: "transparent", color: "#666", marginTop: "20px", border: "1px solid #ddd" }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
