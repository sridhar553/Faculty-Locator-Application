import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const socket = useSocket();

  const [faculty, setFaculty] = useState([]);
  const [examMode, setExamMode] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const [form, setForm] = useState({
    id: "",
    password: "",
    name: "",
    department: "",
    subject: "",
    timetableLocation: ""
  });

  useEffect(() => {
    loadFaculty();
    loadConfig();
    loadLogs();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("statusUpdate", () => loadFaculty());
    socket.on("configUpdate", ({ key, value }) => {
      if (key === "examMode") setExamMode(value);
    });
    return () => {
      socket.off("statusUpdate");
      socket.off("configUpdate");
    };
  }, [socket]);

  function loadConfig() {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/config`)
      .then(res => res.json())
      .then(data => {
        const mode = data.find(c => c.key === "examMode")?.value;
        setExamMode(!!mode);
      });
  }

  function loadLogs() {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/config/logs`, {
      headers: { "Authorization": `Bearer ${user.token} ` }
    })
      .then(res => res.json())
      .then(data => setLogs(data));
  }

  function toggleExamMode() {
    const newValue = !examMode;
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token} `
      },
      body: JSON.stringify({ key: "examMode", value: newValue })
    })
      .then(res => {
        if (res.ok) {
          setExamMode(newValue);
          toast.success(`Exam Mode ${newValue ? "Enabled" : "Disabled"} `);
        }
      });
  }

  // GET faculty from backend
  function loadFaculty() {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/faculty`)
      .then(res => res.json())
      .then(data => setFaculty(data))
      .catch(err => console.error(err));
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // POST faculty to backend
  function addFaculty() {
    if (!form.id || !form.name || !form.password) {
      alert("Faculty ID, Name and Password required");
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/faculty`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.token} `
      },
      body: JSON.stringify(form)
    })
      .then(async res => {
        const data = await res.json();
        if (res.ok) {
          setForm({ id: "", password: "", name: "", department: "", subject: "", timetableLocation: "" });
          loadFaculty();
          toast.success("Faculty added successfully");
        } else {
          alert(data.message || "Error adding faculty");
        }
      })
      .catch(err => console.error(err));
  }

  // DELETE faculty from backend
  function deleteFaculty(id) {
    if (!window.confirm("Are you sure you want to delete this faculty?")) return;

    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/faculty/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${user.token}`
      }
    })
      .then(async res => {
        if (res.ok) {
          loadFaculty();
          toast.error("Faculty removed");
        } else {
          const data = await res.json();
          alert(data.message || "Error deleting faculty");
        }
      })
      .catch(err => console.error(err));
  }

  function handleLogout() {
    logout();
    navigate("/admin-login");
  }

  return (
    <div className="container">
      <h1>Admin Dashboard</h1>

      <div className="card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <h3>System Controls</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <span>Exam Mode: <strong>{examMode ? "ACTIVE" : "OFF"}</strong></span>
          <button
            onClick={toggleExamMode}
            style={{ background: examMode ? "#ef4444" : "#22c55e", color: "white", padding: "5px 15px" }}
          >
            {examMode ? "Disable Exam Mode" : "Enable Exam Mode"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Add New Faculty</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <input name="id" placeholder="Faculty ID" value={form.id} onChange={handleChange} autoComplete="off" />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} autoComplete="new-password" />
          <input name="name" placeholder="Faculty Name" value={form.name} onChange={handleChange} autoComplete="off" />
          <input name="department" placeholder="Department" value={form.department} onChange={handleChange} autoComplete="off" />
          <input name="subject" placeholder="Subject / Specialization" value={form.subject} onChange={handleChange} autoComplete="off" />
          <input name="timetableLocation" placeholder="Default Location" value={form.timetableLocation} onChange={handleChange} autoComplete="off" />
        </div>
        <button className="primary" onClick={addFaculty} style={{ marginTop: "10px", width: "100%" }}>
          Add Faculty Member
        </button>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h3>Faculty Directory</h3>
          <button onClick={() => setShowLogs(!showLogs)} style={{ background: "#6366f1", color: "white" }}>
            {showLogs ? "Show Faculty" : "Show Audit Logs"}
          </button>
        </div>

        {showLogs ? (
          <div style={{ marginTop: "15px" }}>
            {logs.map((log, i) => (
              <div key={i} style={{ fontSize: "0.85em", padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#6366f1" }}>[{new Date(log.timestamp).toLocaleString()}]</span>{" "}
                <strong>{log.facultyName}</strong>: {log.action} <br />
                <small style={{ color: "#64748b" }}>
                  {log.details.current.availability} @ {log.details.current.location}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: "15px" }}>
            {faculty.map(f => (
              <div key={f._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid #f1f5f9" }}>
                <div>
                  <strong>{f.name}</strong> <small style={{ color: "#666" }}>({f.id})</small><br />
                  <span style={{ fontSize: "0.8em" }}>{f.department} - {f.subject}</span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span className={`badge ${f.liveStatus?.availability === "Available" ? "available" : f.liveStatus?.availability === "Busy" ? "busy" : "not"}`} style={{ fontSize: "0.7em" }}>
                    {f.liveStatus?.availability || "Offline"}
                  </span>
                  <button onClick={() => deleteFaculty(f.id)} style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "2px 8px" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        style={{ background: "#4b5563", color: "#fff", marginTop: "20px" }}
        onClick={handleLogout}
      >
        Logout Admin
      </button>
    </div>
  );
}
