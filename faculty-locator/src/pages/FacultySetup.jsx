import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function FacultySetup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing setup token");
      navigate("/");
    }
  }, [token, navigate]);

  function handleSetup(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    fetch("/api/auth/faculty/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    })
      .then(async res => {
        const data = await res.json();
        setLoading(false);
        if (res.ok) {
          login(data);
          toast.success("Password set successfully! Welcome to your dashboard.");
          navigate("/dashboard");
        } else {
          toast.error(data.message || data.error || "Setup failed");
        }
      })
      .catch(err => {
        setLoading(false);
        toast.error("Network error");
        console.error(err);
      });
  }

  if (!token) return null;

  return (
    <div className="container">
      <div className="auth-container premium-card" style={{ maxWidth: "450px", margin: "100px auto" }}>
        <h2 style={{ textAlign: "center", marginBottom: "10px", color: "#1e293b" }}>Welcome to Faculty Locator</h2>
        <p style={{ textAlign: "center", color: "#64748b", marginBottom: "20px" }}>
          Please set your password to activate your account.
        </p>

        <form onSubmit={handleSetup} className="modern-form">
          <div className="form-group">
            <label>New Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter a secure password" 
              required 
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Re-type your password" 
              required 
            />
          </div>
          <button type="submit" className="primary-btn submit-btn" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Saving..." : "Set Password & Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
