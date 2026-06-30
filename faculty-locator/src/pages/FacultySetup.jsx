import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function FacultySetup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or missing setup token");
      navigate("/");
    }
  }, [token, navigate]);

  function getPasswordStrength(pass) {
    if (!pass) return { score: 0, label: "", color: "transparent" };
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, label: "Weak", color: "#ef4444" };
    if (score <= 4) return { score, label: "Medium", color: "#f59e0b" };
    return { score, label: "Strong", color: "#10b981" };
  }

  const strength = getPasswordStrength(password);

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
          toast.success("Password set successfully! Please log in.");
          navigate("/login");
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
          <div className="form-group" style={{ position: "relative" }}>
            <label>New Password</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter a secure password" 
              required 
              style={{ paddingRight: "40px" }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: "absolute", right: "12px", top: "36px", background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: 0 }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
            {password && (
              <div style={{ marginTop: "8px", fontSize: "0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <div style={{ display: "flex", gap: "4px", flex: 1, marginRight: "10px" }}>
                   <div style={{ height: "4px", flex: 1, borderRadius: "2px", background: strength.score >= 1 ? strength.color : "#e2e8f0", transition: "background 0.3s" }}></div>
                   <div style={{ height: "4px", flex: 1, borderRadius: "2px", background: strength.score >= 3 ? strength.color : "#e2e8f0", transition: "background 0.3s" }}></div>
                   <div style={{ height: "4px", flex: 1, borderRadius: "2px", background: strength.score >= 5 ? strength.color : "#e2e8f0", transition: "background 0.3s" }}></div>
                 </div>
                 <span style={{ color: strength.color, fontWeight: "bold", width: "50px", textAlign: "right" }}>{strength.label}</span>
              </div>
            )}
          </div>
          <div className="form-group" style={{ position: "relative" }}>
            <label>Confirm Password</label>
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Re-type your password" 
              required 
              style={{ paddingRight: "40px" }}
            />
            <button 
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ position: "absolute", right: "12px", top: "36px", background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: 0 }}
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <button type="submit" className="primary-btn submit-btn" disabled={loading} style={{ width: "100%", marginTop: "10px" }}>
            {loading ? "Saving..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
