import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentSearch() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/faculty")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setFaculty(data); })
      .catch(err => console.error(err));

    fetch("/api/departments")
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setDepartments(data); })
      .catch(err => console.error(err));
  }, []);

  const filteredDepts = query.trim()
    ? departments.filter(d => d.name.toLowerCase().includes(query.toLowerCase()))
    : departments;

  function handleCardClick(deptName) {
    navigate(`/departments/${encodeURIComponent(deptName)}`);
  }

  return (
    <div className="student-search-wrap" style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px", fontFamily: "'Inter', sans-serif" }}>
      
      {/* Page Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ margin: "0 0 12px 0", fontSize: "2.2rem", fontWeight: 700, color: "#0f172a" }}>
          Faculty Directory
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "1.1rem" }}>
          Select a department to find your professor
        </p>
      </div>

      {/* Search Bar */}
      <div className="dept-search-bar" style={{
        display: "flex", alignItems: "center",
        background: "#fff", borderRadius: "50px",
        border: "1px solid #e2e8f0",
        padding: "4px 20px", marginBottom: "48px",
        maxWidth: "560px", margin: "0 auto 48px auto",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search departments..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1, border: "none", background: "transparent",
            padding: "14px 12px", fontSize: "1rem", outline: "none", color: "#1e293b"
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8" }}>✕</button>
        )}
      </div>

      {/* Department Cards Grid */}
      <div className="dept-card-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "20px"
      }}>
        {filteredDepts.map(dept => {
          const count = faculty.filter(f => f.department === dept.name).length;
          return (
            <div
              key={dept.id}
              onClick={() => handleCardClick(dept.name)}
              style={{
                position: "relative",
                borderRadius: "16px",
                overflow: "hidden",
                cursor: "pointer",
                height: "200px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                transition: "transform 0.25s, box-shadow 0.25s",
                backgroundImage: dept.imageUrl ? `url(${dept.imageUrl})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundColor: "#4f46e5"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
              }}
            >
              {/* Gradient Overlay */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)"
              }} />
              {/* Content */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "16px 20px", color: "#fff"
              }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {dept.name}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                  {count} Faculty Member{count !== 1 ? "s" : ""}
                </p>
              </div>
              {/* Arrow Icon */}
              <div style={{
                position: "absolute", top: "14px", right: "14px",
                width: "32px", height: "32px", borderRadius: "50%",
                background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff"
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </div>
          );
        })}

        {/* ALL FACULTY Card — always last */}
        {!query && (
          <div
            onClick={() => handleCardClick("All")}
            style={{
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              cursor: "pointer",
              height: "200px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              transition: "transform 0.25s, box-shadow 0.25s",
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(79, 70, 229, 0.35)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
            }}
          >
            {/* Decorative circles */}
            <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
            <div style={{ position: "absolute", bottom: "-30px", left: "-20px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

            {/* Content */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              padding: "16px 20px", color: "#fff"
            }}>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                All Faculty
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                {faculty.length} Total Member{faculty.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Grid Icon */}
            <div style={{
              position: "absolute", top: "14px", right: "14px",
              width: "32px", height: "32px", borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
