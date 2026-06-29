import { useEffect, useState } from "react";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

export default function StudentSearch() {
  const [query, setQuery] = useState("");
  const [faculty, setFaculty] = useState([]);
  const [results, setResults] = useState([]);
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

  const displayedFaculty = examMode
    ? results.filter(f => f.liveStatus?.availability === "Available" || f.liveStatus?.availability === "Busy")
    : results;

  return (
    <div className="container">
      {examMode && (
        <div className="banner danger" style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "8px", marginBottom: "20px", textAlign: "center", border: "1px solid #f87171" }}>
          <strong>EXAM MODE ON:</strong> Showing only active faculty for practical examinations.
        </div>
      )}

      <h1>Faculty Locator</h1>
      <p style={{ color: "#555" }}>
        Find faculty availability and location in real-time.
      </p>

      <div className="search-box">
        <input
          placeholder="Search faculty name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button onClick={search}>Search</button>
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
