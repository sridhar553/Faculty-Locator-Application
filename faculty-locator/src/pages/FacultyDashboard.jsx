import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState(null);
  const [availability, setAvailability] = useState("Available");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const facultyId = localStorage.getItem("loggedFaculty");
    if (!facultyId) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:5000/api/faculty")
      .then(res => res.json())
      .then(data => {
        const f = data.find(x => x.id === facultyId);
        if (!f) {
          alert("Faculty not found");
          navigate("/login");
          return;
        }
        setFaculty(f);
        setAvailability(f.liveStatus?.availability || "Available");
        setLocation(f.liveStatus?.location || "");
      })
      .catch(err => console.error(err));
  }, [navigate]);

  function updateStatus() {
    fetch(`http://localhost:5000/api/faculty/${faculty.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        availability,
        location,
        updatedAt: new Date().toLocaleTimeString()
      })
    })
      .then(() => alert("Status updated"))
      .catch(err => console.error(err));
  }

  function logout() {
    localStorage.removeItem("loggedFaculty");
    navigate("/login");
  }

  if (!faculty) return null;

  return (
    <div className="container">
      <h1>Faculty Dashboard</h1>

      <div className="card">
        <h3>{faculty.name}</h3>
        <p>{faculty.department}</p>
        <p>Default Location: {faculty.timetableLocation}</p>
      </div>

      <div className="card">
        <label>Availability</label>
        <select value={availability} onChange={e => setAvailability(e.target.value)}>
          <option>Available</option>
          <option>Busy</option>
          <option>Not Available</option>
        </select>

        <label>Current Location</label>
        <input
          placeholder="Example: CS Block Lab 2"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />

        <button className="primary" onClick={updateStatus}>
          Update Status
        </button>

        <button
          style={{ background: "#ef4444", color: "#fff", marginTop: "10px" }}
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
