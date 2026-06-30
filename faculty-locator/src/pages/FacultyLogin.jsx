import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function FacultyLogin() {
  const [facultyId, setFacultyId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/faculty/login", {
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
      <div className="auth-container">
        <h2>Faculty Login</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Faculty ID</label>
            <input
              placeholder="Enter your ID (e.g. F001)"
              value={facultyId}
              onChange={e => setFacultyId(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="primary">
            Login to Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
