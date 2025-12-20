import { useEffect, useState } from "react";

export default function StudentSearch() {
  const [query, setQuery] = useState("");
  const [faculty, setFaculty] = useState([]);
  const [results, setResults] = useState([]);

  // Fetch faculty from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/faculty")
      .then(res => res.json())
      .then(data => {
        setFaculty(data);
        setResults(data);
      })
      .catch(err => console.error(err));
  }, []);

  function search() {
    const filtered = faculty.filter(f =>
      f.name.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }

  return (
    <div className="container">
      <h1>Faculty Locator</h1>
      <p style={{ color: "#555" }}>
        Find faculty availability and location during practical exams
      </p>

      <div className="search-box">
        <input
          placeholder="Search faculty name..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button onClick={search}>Search</button>
      </div>

      {results.length === 0 && (
        <p style={{ marginTop: "20px", color: "#777" }}>
          No faculty found
        </p>
      )}

      {results.map(f => {
        const status = f.liveStatus?.availability || "Not Updated";
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
            <h3>{f.name}</h3>
            <p>{f.department}</p>

            <span className={`badge ${cls}`}>{status}</span>

            <p>📍 {location}</p>
            <p>🕒 Last updated: {time}</p>
          </div>
        );
      })}
    </div>
  );
}
