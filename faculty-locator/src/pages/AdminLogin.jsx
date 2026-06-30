import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    fetch("/api/auth/admin/status")
      .then(res => res.json())
      .then(data => {
        setIsSetupMode(data.isSetupNeeded);
        setIsChecking(false);
      })
      .catch(err => {
        console.error(err);
        setIsChecking(false);
      });
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const endpoint = isSetupMode ? "/api/auth/admin/setup" : "/api/auth/admin/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok) {
        login(data);
        navigate("/admin");
      } else {
        setError(data.message || (isSetupMode ? "Setup failed" : "Login failed"));
      }
    } catch (err) {
      setError("Server error. Please try again.");
      console.error(err);
    }
  }

  if (isChecking) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="auth-container">
        <h2>{isSetupMode ? "Admin Setup" : "Admin Login"}</h2>
        {isSetupMode && (
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "8px", marginBottom: "15px", color: "#1e3a8a", fontSize: "0.9em" }}>
            Welcome! It looks like you haven't set an admin password yet. Please create one below. You will use this password for all future logins.
          </div>
        )}
        {error && <p style={{ color: "red" }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>{isSetupMode ? "Create Admin Password" : "Admin Password"}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSetupMode ? "Enter a strong password" : "Enter admin password"}
              required
            />
          </div>
          <button type="submit">
            {isSetupMode ? "Save Password & Login" : "Access Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}
