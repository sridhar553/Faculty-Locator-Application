import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [activeTab, setActiveTab] = useState("faculty"); // "faculty" or "admin"
  
  // Faculty State
  const [facultyId, setFacultyId] = useState("");
  const [facultyPassword, setFacultyPassword] = useState("");
  
  // Admin State
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminSetupMode, setIsAdminSetupMode] = useState(false);
  const [isAdminChecking, setIsAdminChecking] = useState(true);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/admin");
      if (user.role === "faculty") navigate("/dashboard");
    }
  }, [user, navigate]);

  // Check Admin Setup Status
  useEffect(() => {
    fetch("/api/auth/admin/status")
      .then(res => res.json())
      .then(data => {
        setIsAdminSetupMode(data.isSetupNeeded);
        setIsAdminChecking(false);
      })
      .catch(err => {
        console.error("Admin status error:", err);
        setIsAdminChecking(false);
      });
  }, []);

  async function handleFacultyLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/auth/faculty/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: facultyId, password: facultyPassword })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        login(data);
        navigate("/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setLoading(false);
      setError("Server error. Please try again.");
      console.error(err);
    }
  }

  async function handleAdminLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isAdminSetupMode ? "/api/auth/admin/setup" : "/api/auth/admin/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        login(data);
        navigate("/admin");
      } else {
        setError(data.message || (isAdminSetupMode ? "Setup failed" : "Login failed"));
      }
    } catch (err) {
      setLoading(false);
      setError("Server error. Please try again.");
      console.error(err);
    }
  }

  return (
    <div className="container">
      <div className="auth-container premium-card" style={{ maxWidth: "450px", margin: "60px auto", padding: "0" }}>
        
        {/* Toggle Header */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
          <button 
            type="button"
            onClick={() => { setActiveTab("faculty"); setError(""); }}
            style={{ 
              flex: 1, 
              padding: "20px", 
              background: activeTab === "faculty" ? "transparent" : "#f8fafc",
              color: activeTab === "faculty" ? "#4f46e5" : "#64748b",
              borderBottom: activeTab === "faculty" ? "2px solid #4f46e5" : "2px solid transparent",
              fontWeight: activeTab === "faculty" ? "bold" : "600",
              borderRadius: "16px 0 0 0",
              boxShadow: "none",
              margin: 0
            }}
          >
            Faculty Login
          </button>
          <button 
            type="button"
            onClick={() => { setActiveTab("admin"); setError(""); }}
            style={{ 
              flex: 1, 
              padding: "20px", 
              background: activeTab === "admin" ? "transparent" : "#f8fafc",
              color: activeTab === "admin" ? "#4f46e5" : "#64748b",
              borderBottom: activeTab === "admin" ? "2px solid #4f46e5" : "2px solid transparent",
              fontWeight: activeTab === "admin" ? "bold" : "600",
              borderRadius: "0 16px 0 0",
              boxShadow: "none",
              margin: 0
            }}
          >
            Admin Login
          </button>
        </div>

        <div style={{ padding: "40px" }}>
          {error && (
            <div style={{ padding: "12px", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", marginBottom: "20px", fontSize: "0.9rem", textAlign: "center" }}>
              {error}
            </div>
          )}

          {/* FACULTY FORM */}
          {activeTab === "faculty" && (
            <form onSubmit={handleFacultyLogin} className="modern-form">
              <h2 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "#0f172a", textAlign: "center" }}>
                Welcome Back
              </h2>
              <div className="form-group">
                <label>Faculty ID</label>
                <input
                  placeholder="e.g. CS-46948"
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
                  value={facultyPassword}
                  onChange={e => setFacultyPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="primary-btn submit-btn" disabled={loading} style={{ width: "100%", marginTop: "10px" }}>
                {loading ? "Logging in..." : "Access Dashboard"}
              </button>
            </form>
          )}

          {/* ADMIN FORM */}
          {activeTab === "admin" && (
            <div className="modern-form">
              <h2 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "#0f172a", textAlign: "center" }}>
                {isAdminSetupMode ? "Admin Setup" : "System Control"}
              </h2>
              
              {isAdminChecking ? (
                <p style={{ textAlign: "center", color: "#64748b" }}>Checking system status...</p>
              ) : (
                <form onSubmit={handleAdminLogin}>
                  {isAdminSetupMode && (
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px", marginBottom: "20px", color: "#1e3a8a", fontSize: "0.85rem", lineHeight: "1.4" }}>
                      <strong>Welcome!</strong> No admin password is set. Create your master password below to initialize the system.
                    </div>
                  )}
                  <div className="form-group">
                    <label>{isAdminSetupMode ? "Create Master Password" : "Master Password"}</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder={isAdminSetupMode ? "Enter a strong password" : "Enter your master password"}
                      required
                    />
                  </div>
                  <button type="submit" className="primary-btn submit-btn" disabled={loading} style={{ width: "100%", marginTop: "10px" }}>
                    {loading ? (isAdminSetupMode ? "Saving..." : "Logging in...") : (isAdminSetupMode ? "Initialize System" : "Access Admin Panel")}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
