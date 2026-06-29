import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function FacultyLogin() {
  const [facultyId, setFacultyId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLogin() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/faculty/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: facultyId, password })
      });

      const data = await res.json();

      if (res.ok) {
        login(data);
        navigate("/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Server error. Please try again.");
      console.error(err);
    }
  }

  return (
    <div className="container">
      <h1>Faculty Login</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        placeholder="Enter Faculty ID"
        value={facultyId}
        onChange={e => setFacultyId(e.target.value)}
        autoComplete="off"
      />
      <input
        type="password"
        placeholder="Enter Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      <button className="primary" onClick={handleLogin}>
        Login
      </button>
    </div>
  );
}
