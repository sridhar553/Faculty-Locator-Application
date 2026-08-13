import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";

export default function DepartmentFaculty() {
  const { deptName } = useParams(); // will be "All" or an encoded dept name
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const socket = useSocket();

  const isAll = deptName === "All";
  const displayName = decodeURIComponent(deptName);

  useEffect(() => {
    setLoading(true);
    fetch("/api/faculty")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const filtered = isAll
            ? data
            : data.filter(f => f.department === displayName);
          setFaculty(filtered);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [deptName]);

  useEffect(() => {
    if (!socket) return;
    socket.on("statusUpdate", (updatedFaculty) => {
      setFaculty(prev =>
        prev.map(f =>
          f.id === updatedFaculty.id ? { ...f, liveStatus: updatedFaculty.liveStatus } : f
        )
      );
      if (updatedFaculty.liveStatus.availability === "Available") {
        toast.success(`A faculty member is now Available!`, { id: updatedFaculty.id });
      }
    });
    return () => socket.off("statusUpdate");
  }, [socket]);

  const displayed = query.trim()
    ? faculty.filter(f => {
        const q = query.toLowerCase();
        return (
          f.name?.toLowerCase().includes(q) ||
          f.subject?.toLowerCase().includes(q) ||
          f.timetableLocation?.toLowerCase().includes(q)
        );
      })
    : faculty;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 20px", fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
        <button
          onClick={() => navigate("/departments")}
          style={{
            background: "#f1f5f9", border: "none", borderRadius: "50%",
            width: "40px", height: "40px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#475569", flexShrink: 0
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <p style={{ margin: "0 0 2px 0", fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Department</p>
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: "1.8rem", fontWeight: 700 }}>
            {isAll ? "All Faculty" : displayName}
          </h1>
        </div>
        <div style={{ marginLeft: "auto", background: "#f1f5f9", borderRadius: "12px", padding: "8px 16px", fontWeight: 600, color: "#475569", fontSize: "0.9rem" }}>
          {displayed.length} member{displayed.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{
        display: "flex", alignItems: "center",
        background: "#fff", borderRadius: "50px",
        border: "1px solid #e2e8f0",
        padding: "4px 16px", marginBottom: "32px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder={`Search in ${isAll ? "all faculty" : displayName}...`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1, border: "none", background: "transparent",
            padding: "12px 10px", fontSize: "1rem", outline: "none", color: "#1e293b"
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: "4px" }}>✕</button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>Loading faculty...</div>
      )}

      {/* No results */}
      {!loading && displayed.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
          <p style={{ fontSize: "2rem", margin: "0 0 12px 0" }}>🔍</p>
          <h3 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>No faculty found</h3>
          <p style={{ color: "#94a3b8", margin: 0 }}>Try a different search term.</p>
        </div>
      )}

      {/* Faculty Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
        {displayed.map(f => {
          const status = f.liveStatus?.availability || "Offline";
          const location = f.liveStatus?.location || f.timetableLocation || "—";
          const updatedAt = f.liveStatus?.updatedAt || "N/A";

          const statusColor =
            status === "Available" ? { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", dot: "#22c55e" }
            : status === "Busy"    ? { bg: "#fefce8", border: "#fef08a", text: "#854d0e", dot: "#eab308" }
            :                        { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", dot: "#ef4444" };

          return (
            <div key={f._id || f.id} style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #f1f5f9",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              transition: "box-shadow 0.2s, transform 0.2s",
              cursor: "default"
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {/* Top Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                {/* Avatar + Name */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "46px", height: "46px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0
                  }}>
                    {f.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>{f.name}</h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                      {f.department}{f.subject ? ` | ${f.subject}` : ""}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <span style={{
                  background: statusColor.bg, border: `1px solid ${statusColor.border}`,
                  color: statusColor.text, padding: "4px 10px",
                  borderRadius: "50px", fontSize: "0.75rem", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: "5px", flexShrink: 0
                }}>
                  <span style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: statusColor.dot,
                    boxShadow: status === "Available" ? `0 0 6px ${statusColor.dot}` : "none"
                  }}></span>
                  {status}
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "#f1f5f9", margin: "0 0 14px 0" }}></div>

              {/* Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", color: "#475569" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span style={{ fontWeight: 500, color: "#1e293b" }}>{location}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#94a3b8" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  Last updated: {updatedAt}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
