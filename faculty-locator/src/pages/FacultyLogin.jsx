import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FacultyLogin() {
  const [facultyId, setFacultyId] = useState("");
  const navigate = useNavigate();

  function login() {
    fetch("http://localhost:5000/api/faculty")
      .then(res => res.json())
      .then(data => {
        const faculty = data.find(f => f.id === facultyId);
        if (!faculty) {
          alert("Faculty not found");
          return;
        }
        localStorage.setItem("loggedFaculty", faculty.id);
        navigate("/dashboard");
      })
      .catch(err => console.error(err));
  }

  return (
    <div className="container">
      <h1>Faculty Login</h1>

      <input
        placeholder="Enter Faculty ID"
        value={facultyId}
        onChange={e => setFacultyId(e.target.value)}
      />

      <button className="primary" onClick={login}>
        Login
      </button>
    </div>
  );
}
