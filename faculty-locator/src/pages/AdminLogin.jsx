import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleLogin() {
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        login(data);
        navigate("/admin");
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
      <h1>Admin Login</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <input
        type="password"
        placeholder="Admin Password"
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
