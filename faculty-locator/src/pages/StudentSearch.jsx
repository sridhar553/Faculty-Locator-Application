import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

export default function StudentSearch() {
  const [query, setQuery] = useState("");
  const [faculty, setFaculty] = useState([]);
  const [results, setResults] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [examMode, setExamMode] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    // 1. Initial Fetch
    fetch("/api/faculty")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFaculty(data);
          setResults(data);
        } else {
          console.error("API returned error:", data);
        }
      })
      .catch(err => console.error(err));

    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mode = data.find(c => c.key === "examMode")?.value;
          setExamMode(!!mode);
        }
      })
      .catch(err => console.error(err));

    fetch("/api/departments")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDepartments(data);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!socket) return;

    // 2. Socket Listeners
    socket.on("statusUpdate", (updatedFaculty) => {
      setFaculty(prev => prev.map(f =>
        f.id === updatedFaculty.id ? { ...f, liveStatus: updatedFaculty.liveStatus } : f
      ));

      // Update filtered results too
      setResults(prev => prev.map(f =>
        f.id === updatedFaculty.id ? { ...f, liveStatus: updatedFaculty.liveStatus } : f
      ));

      if (updatedFaculty.liveStatus.availability === "Available") {
        const name = faculty.find(f => f.id === updatedFaculty.id)?.name || "A faculty member";
        toast.success(`${name} is now Available!`, { id: updatedFaculty.id });
      }
    });

    socket.on("configUpdate", ({ key, value }) => {
      if (key === "examMode") {
        setExamMode(value);
        toast(value ? "⚠️ Exam Mode is now ENABLED" : "✅ Exam Mode is now DISABLED", { icon: value ? "⚠️" : "✅" });
      }
    });

    return () => {
      socket.off("statusUpdate");
      socket.off("configUpdate");
    };
  }, [socket, faculty]);

  function search() {
    const filtered = faculty.filter(f =>
      f.name.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }

  let displayedFaculty = examMode
    ? results.filter(f => f.liveStatus?.availability === "Available" || f.liveStatus?.availability === "Busy")
    : results;

  if (selectedDepartment !== "All") {
    displayedFaculty = displayedFaculty.filter(f => f.department === selectedDepartment);
  }

  return (
    <div className="container">
      {examMode && (
        <div className="banner danger" style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "8px", marginBottom: "20px", textAlign: "center", border: "1px solid #f87171" }}>
          <strong>EXAM MODE ON:</strong> Showing only active faculty for practical examinations.
        </div>
      )}

      <div className="advanced-search-container" style={{ display: 'flex', gap: '8px', background: '#fff', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search faculty name, department..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', boxShadow: 'none', padding: '8px 16px', fontSize: '1rem' }}
        />
        <button className="primary-btn" onClick={search} style={{ padding: '0 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.2rem', marginRight: '6px' }}>🔍</span> Search
        </button>
        <button className="primary-btn" style={{ padding: '0 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
          <span style={{ fontSize: '1.2rem' }}>⚙️</span>
        </button>
      </div>

      <div className="departments-section">
        <div className="department-filters">
          <button 
            className={`dept-pill ${selectedDepartment === "All" ? "active" : ""}`}
            onClick={() => setSelectedDepartment("All")}
          >
            All Departments
          </button>
          {departments.map(d => (
            <button 
              key={d.id} 
              className={`dept-pill ${selectedDepartment === d.name ? "active" : ""}`}
              onClick={() => setSelectedDepartment(d.name)}
            >
              {d.name}
            </button>
          ))}
        </div>

        <div className="department-cards-grid">
          {departments.map(dept => (
            <div 
              key={dept.id} 
              className={`dept-card ${selectedDepartment === dept.name ? "selected" : ""}`}
              style={{ backgroundImage: `url(${dept.imageUrl})` }}
              onClick={() => setSelectedDepartment(selectedDepartment === dept.name ? "All" : dept.name)}
            >
              <div className="dept-overlay">
                <h4>{dept.name}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      {displayedFaculty.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", background: "var(--surface)", borderRadius: "12px", marginTop: "20px" }}>
          <h3>No {examMode ? "active" : ""} faculty found</h3>
          <p>Please check your connection or database setup.</p>
        </div>
      )}

      <div className="faculty-grid">
      {displayedFaculty.map(f => {
        const status = f.liveStatus?.availability || "Offline";
        const location = f.liveStatus?.location || f.timetableLocation;
        const time = f.liveStatus?.updatedAt || "N/A";

        const cls =
          status === "Available"
            ? "available"
            : status === "Busy"
              ? "busy"
              : "not";

        return (
          <div className="card" key={f._id || f.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3>{f.name}</h3>
                <p>{f.department} {f.subject ? `| ${f.subject}` : ""}</p>
              </div>
              <span className={`badge ${cls}`} style={{ position: "relative" }}>
                {status === "Available" && <span className="ping-dot"></span>}
                {status}
              </span>
            </div>

            <p style={{ marginTop: "10px" }}>📍 {location}</p>
            <p style={{ fontSize: "0.85em", color: "#666" }}>🕒 Last updated: {time}</p>
          </div>
        );
      })}
      </div>
    </div>
  );
}
